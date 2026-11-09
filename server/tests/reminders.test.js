import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/config/db.js';
import {
  claimAndDispatchReminder,
  processEventReminders,
  startReminderScheduler,
  stopReminderScheduler,
} from '../src/services/reminderService.js';

describe('Phase 5.3 – Reminder Scheduler Concurrency & Lease Reliability', () => {
  let testUser;
  let testEvent;
  let testReg;

  beforeAll(async () => {
    // 1. Setup clean test user and event
    const time = Date.now();
    const role = await prisma.role.findFirst({ where: { name: 'ATTENDEE' } });
    const organizer = await prisma.user.findFirst({ where: { email: 'elena@novatech.io' } });
    const cat = await prisma.category.findFirst();
    const loc = await prisma.location.findFirst();

    testUser = await prisma.user.create({
      data: {
        email: `reminder_user_${time}@test.com`,
        passwordHash: 'hashed_pw',
        fullName: 'Reminder Test User',
        roleId: role.id,
      },
    });

    testEvent = await prisma.event.create({
      data: {
        title: `Reminder Test Event ${time}`,
        description: 'Reliability test for reminder worker',
        startDate: new Date(Date.now() + 24 * 3600 * 1000), // Exactly 24h away
        endDate: new Date(Date.now() + 26 * 3600 * 1000),
        organizerId: organizer.id,
        categoryId: cat.id,
        locationId: loc.id,
        status: 'DRAFT', // Isolated from global sweeper
      },
    });

    testReg = await prisma.registration.create({
      data: {
        eventId: testEvent.id,
        userId: testUser.id,
        ticketCode: `EVT-REM-${time.toString().slice(-4)}`,
        status: 'CONFIRMED',
      },
    });
  });

  afterAll(async () => {
    stopReminderScheduler();
  });

  it('1. should claim and dispatch a reminder, transitioning status to SENT with attemptCount = 1', async () => {
    const res = await claimAndDispatchReminder({
      event: testEvent,
      reg: testReg,
      reminderType: '24H',
      title: '24H Test Reminder',
      message: 'Event is tomorrow.',
    });

    expect(res.status).toBe('SENT');

    const reminder = await prisma.eventReminder.findUnique({
      where: {
        eventId_userId_reminderType: {
          eventId: testEvent.id,
          userId: testUser.id,
          reminderType: '24H',
        },
      },
    });

    expect(reminder).toBeDefined();
    expect(reminder.status).toBe('SENT');
    expect(reminder.sentAt).toBeDefined();
    expect(reminder.attemptCount).toBe(1);

    // Verify in-app notification delivered
    const notif = await prisma.notification.findFirst({
      where: {
        userId: testUser.id,
        eventId: testEvent.id,
        title: '24H Test Reminder',
      },
    });
    expect(notif).toBeDefined();
  });

  it('2. should skip an already SENT reminder on repeated processing (Idempotency guarantee)', async () => {
    const res = await claimAndDispatchReminder({
      event: testEvent,
      reg: testReg,
      reminderType: '24H',
      title: '24H Duplicate Attempt',
      message: 'Should not send duplicate.',
    });

    expect(res.status).toBe('SKIPPED');

    // Verify only 1 notification exists for this user and event
    const notifs = await prisma.notification.findMany({
      where: {
        userId: testUser.id,
        eventId: testEvent.id,
        title: '24H Test Reminder',
      },
    });
    expect(notifs.length).toBe(1);
  });

  it('3. should recover an expired claim lease (> 5 mins old) after a simulated worker crash', async () => {
    // Simulate an uncompleted claim from 10 minutes ago (e.g. worker process crashed mid-flight)
    const crashedTime = new Date(Date.now() - 10 * 60 * 1000);
    const crashedReminder = await prisma.eventReminder.create({
      data: {
        eventId: testEvent.id,
        userId: testUser.id,
        reminderType: '2H',
        scheduledFor: testEvent.startDate,
        status: 'CLAIMED',
        attemptCount: 1,
        lastAttempt: crashedTime,
      },
    });

    // Next worker runs
    const res = await claimAndDispatchReminder({
      event: testEvent,
      reg: testReg,
      reminderType: '2H',
      title: '2H Recovered Reminder',
      message: 'Starts soon.',
    });

    expect(res.status).toBe('SENT');

    const updated = await prisma.eventReminder.findUnique({
      where: { id: crashedReminder.id },
    });

    expect(updated.status).toBe('SENT');
    expect(updated.attemptCount).toBe(2); // Incremented from 1 to 2
    expect(updated.sentAt).toBeDefined();
  });

  it('4. should permanently cease retrying when attemptCount reaches 3 (Poison pill protection)', async () => {
    // Set a failed reminder that has already failed 3 times
    const expiredTime = new Date(Date.now() - 15 * 60 * 1000);
    await prisma.eventReminder.update({
      where: {
        eventId_userId_reminderType: {
          eventId: testEvent.id,
          userId: testUser.id,
          reminderType: '2H',
        },
      },
      data: {
        status: 'FAILED',
        attemptCount: 3,
        lastAttempt: expiredTime,
        failureReason: 'Repeated network timeout',
      },
    });

    const res = await claimAndDispatchReminder({
      event: testEvent,
      reg: testReg,
      reminderType: '2H',
      title: '2H Over-Limit Attempt',
      message: 'Should not be processed.',
    });

    expect(res.status).toBe('SKIPPED');

    const unchanged = await prisma.eventReminder.findUnique({
      where: {
        eventId_userId_reminderType: {
          eventId: testEvent.id,
          userId: testUser.id,
          reminderType: '2H',
        },
      },
    });

    expect(unchanged.status).toBe('FAILED');
    expect(unchanged.attemptCount).toBe(3);
  });

  it('5. should gracefully start and stop the scheduler interval without memory leaks', () => {
    expect(() => {
      startReminderScheduler(60000);
      startReminderScheduler(60000); // Idempotent start
      stopReminderScheduler();
      stopReminderScheduler(); // Idempotent stop
    }).not.toThrow();
  });
});

