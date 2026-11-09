import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { generateTicketToken } from '../src/controllers/ticketController.js';

describe('Phase 5.5 – Dedicated PostgreSQL Concurrency & Transaction Integrity Suite', () => {
  let organizerToken;
  let organizerUser;
  let categoryId;
  let locationId;
  let postgresVersion;

  beforeAll(async () => {
    // 1. Query live PostgreSQL version
    const versionRes = await prisma.$queryRaw`SELECT version()`;
    postgresVersion = versionRes[0].version;

    // 2. Obtain organizer credentials
    const orgLogin = await request(app).post('/api/auth/login').send({
      email: 'elena@novatech.io',
      password: 'password123',
    });
    organizerToken = orgLogin.body.token;
    organizerUser = orgLogin.body.user;

    const cat = await prisma.category.findFirst();
    const loc = await prisma.location.findFirst();
    categoryId = cat.id;
    locationId = loc.id;
  });

  it('PostgreSQL Version Verification', () => {
    expect(postgresVersion).toContain('PostgreSQL 16');
  });

  // ==========================================
  // TEST 1: Flash Registration (10 concurrent requests -> 1 seat)
  // ==========================================
  it('Test 1: Flash Registration – 10 concurrent requests for 1 seat in PostgreSQL', async () => {
    const flashEvent = await prisma.event.create({
      data: {
        title: `PG Flash Registration Event ${Date.now()}`,
        description: 'PostgreSQL concurrency flash test',
        startDate: new Date(Date.now() + 7 * 86400 * 1000),
        maxCapacity: 1,
        currentRegistered: 0,
        status: 'PUBLISHED',
        organizerId: organizerUser.id,
        categoryId,
        locationId,
      },
    });

    // Create 10 distinct attendees
    const batch = Date.now();
    const attendeeTokens = [];
    for (let i = 0; i < 10; i++) {
      const reg = await request(app).post('/api/auth/register').send({
        fullName: `PG Flash User ${i}`,
        email: `pg_flash_${batch}_${i}@test.com`,
        password: 'password123',
        role: 'ATTENDEE',
      });
      attendeeTokens.push(reg.body.token);
    }

    // Fire 10 simultaneous registration requests
    const start = Date.now();
    const responses = await Promise.all(
      attendeeTokens.map((token) =>
        request(app)
          .post(`/api/events/${flashEvent.id}/register`)
          .set('Authorization', `Bearer ${token}`)
      )
    );
    const duration = Date.now() - start;

    const successes = responses.filter((r) => r.status === 201);
    const rejections = responses.filter((r) => r.status === 400);

    expect(successes.length).toBe(1);
    expect(rejections.length).toBe(9);

    // Direct PostgreSQL row count assertion
    const dbEvent = await prisma.event.findUnique({ where: { id: flashEvent.id } });
    expect(dbEvent.currentRegistered).toBe(1);

    const dbRegCount = await prisma.registration.count({
      where: { eventId: flashEvent.id, status: 'CONFIRMED' },
    });
    expect(dbRegCount).toBe(1);
  });

  // ==========================================
  // TEST 2: Duplicate Registration (Same user parallel requests)
  // ==========================================
  it('Test 2: Duplicate Registration – Same user fires parallel requests in PostgreSQL', async () => {
    const doubleEvent = await prisma.event.create({
      data: {
        title: `PG Duplicate Reg Event ${Date.now()}`,
        description: 'Duplicate registration test',
        startDate: new Date(Date.now() + 7 * 86400 * 1000),
        maxCapacity: 10,
        currentRegistered: 0,
        status: 'PUBLISHED',
        organizerId: organizerUser.id,
        categoryId,
        locationId,
      },
    });

    const user = await request(app).post('/api/auth/register').send({
      fullName: 'Double Booker',
      email: `double_book_${Date.now()}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
    });

    // Fire 3 simultaneous registrations from the exact same user
    const res = await Promise.all([
      request(app).post(`/api/events/${doubleEvent.id}/register`).set('Authorization', `Bearer ${user.body.token}`),
      request(app).post(`/api/events/${doubleEvent.id}/register`).set('Authorization', `Bearer ${user.body.token}`),
      request(app).post(`/api/events/${doubleEvent.id}/register`).set('Authorization', `Bearer ${user.body.token}`),
    ]);

    const successes = res.filter((r) => r.status === 201);
    const rejected = res.filter((r) => r.status === 400);

    expect(successes.length).toBe(1);
    expect(rejected.length).toBe(2);

    // Direct database count for this user and event must be exactly 1
    const userRegs = await prisma.registration.count({
      where: { eventId: doubleEvent.id, userId: user.body.user.id },
    });
    expect(userRegs).toBe(1);
  });

  // ==========================================
  // TEST 3: Attendance Scanner (6 concurrent scans for 1 ticket)
  // ==========================================
  it('Test 3: Attendance Scanner – 6 concurrent scans for 1 valid ticket in PostgreSQL', async () => {
    const scanEvent = await prisma.event.create({
      data: {
        title: `PG Door Scan Event ${Date.now()}`,
        description: 'Door scan race condition test',
        startDate: new Date(Date.now() + 86400 * 1000),
        maxCapacity: 50,
        currentRegistered: 1,
        status: 'PUBLISHED',
        organizerId: organizerUser.id,
        categoryId,
        locationId,
      },
    });

    const att = await request(app).post('/api/auth/register').send({
      fullName: 'Door Attendee',
      email: `door_att_${Date.now()}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
    });

    const regRes = await request(app)
      .post(`/api/events/${scanEvent.id}/register`)
      .set('Authorization', `Bearer ${att.body.token}`);

    const ticketCode = regRes.body.data.ticketCode;
    const token = generateTicketToken(ticketCode, scanEvent.id);

    // Fire 6 simultaneous scan requests
    const scanResults = await Promise.all(
      Array.from({ length: 6 }).map(() =>
        request(app)
          .post('/api/attendance/scan')
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({ ticketCodeOrToken: token, eventId: scanEvent.id, method: 'QR' })
      )
    );

    const successful = scanResults.filter((r) => r.status === 200);
    const conflicts = scanResults.filter((r) => r.status === 409);

    expect(successful.length).toBe(1);
    expect(conflicts.length).toBe(5);

    // Exactly 1 row in attendances table
    const count = await prisma.attendance.count({
      where: { registration: { ticketCode } },
    });
    expect(count).toBe(1);
  });

  // ==========================================
  // TEST 4: Waitlist Queue (6 concurrent waitlist requests)
  // ==========================================
  it('Test 4: Waitlist Queue – 6 concurrent waitlist joins assign sequential positions [1..6] in PostgreSQL', async () => {
    const fullEvent = await prisma.event.create({
      data: {
        title: `PG Waitlist Full Event ${Date.now()}`,
        description: 'Waitlist full race test',
        startDate: new Date(Date.now() + 86400 * 1000),
        maxCapacity: 1,
        currentRegistered: 1,
        status: 'PUBLISHED',
        organizerId: organizerUser.id,
        categoryId,
        locationId,
      },
    });

    const waitlistTokens = [];
    const time = Date.now();
    for (let i = 0; i < 6; i++) {
      const u = await request(app).post('/api/auth/register').send({
        fullName: `PG Waitlist User ${i}`,
        email: `pg_wait_${time}_${i}@test.com`,
        password: 'password123',
        role: 'ATTENDEE',
      });
      waitlistTokens.push(u.body.token);
    }

    const waitlistResponses = await Promise.all(
      waitlistTokens.map((token) =>
        request(app)
          .post(`/api/events/${fullEvent.id}/waitlist`)
          .set('Authorization', `Bearer ${token}`)
      )
    );

    expect(waitlistResponses.every((r) => r.status === 201)).toBe(true);

    const positions = waitlistResponses.map((r) => r.body.data.position).sort((a, b) => a - b);
    expect(positions).toEqual([1, 2, 3, 4, 5, 6]);

    const dbWaitlists = await prisma.waitlist.findMany({
      where: { eventId: fullEvent.id, status: 'PENDING' },
      orderBy: { position: 'asc' },
    });
    expect(dbWaitlists.length).toBe(6);
    expect(dbWaitlists.map((w) => w.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  // ==========================================
  // TEST 5: Simultaneous Waitlist Promotion
  // ==========================================
  it('Test 5: Simultaneous Waitlist Promotion – Only 1 eligible user promoted on cancellation in PostgreSQL', async () => {
    // Create event with capacity 1 and 1 registered user
    const promoEvent = await prisma.event.create({
      data: {
        title: `PG Promo Event ${Date.now()}`,
        description: 'Auto promotion test',
        startDate: new Date(Date.now() + 86400 * 1000),
        maxCapacity: 1,
        currentRegistered: 1,
        status: 'PUBLISHED',
        organizerId: organizerUser.id,
        categoryId,
        locationId,
      },
    });

    // Registered user
    const user1 = await request(app).post('/api/auth/register').send({
      fullName: 'User One',
      email: `user1_${Date.now()}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
    });
    await prisma.registration.create({
      data: {
        eventId: promoEvent.id,
        userId: user1.body.user.id,
        ticketCode: `EVT-P1-${Date.now().toString().slice(-4)}`,
        status: 'CONFIRMED',
      },
    });

    // Waitlist user #1
    const waitUser1 = await request(app).post('/api/auth/register').send({
      fullName: 'Waitlist User 1',
      email: `wait1_${Date.now()}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
    });
    await prisma.waitlist.create({
      data: {
        eventId: promoEvent.id,
        userId: waitUser1.body.user.id,
        status: 'PENDING',
        position: 1,
      },
    });

    // User 1 cancels registration -> should trigger auto promotion of Waitlist User 1
    const cancelRes = await request(app)
      .delete(`/api/events/${promoEvent.id}/register`)
      .set('Authorization', `Bearer ${user1.body.token}`);

    expect(cancelRes.status).toBe(200);

    // Verify Waitlist User 1 is now CONFIRMED in registrations
    const promotedReg = await prisma.registration.findUnique({
      where: { userId_eventId: { userId: waitUser1.body.user.id, eventId: promoEvent.id } },
    });
    expect(promotedReg).toBeDefined();
    expect(promotedReg.status).toBe('CONFIRMED');

    // Waitlist record is ACCEPTED
    const waitRecord = await prisma.waitlist.findUnique({
      where: { userId_eventId: { userId: waitUser1.body.user.id, eventId: promoEvent.id } },
    });
    expect(waitRecord.status).toBe('ACCEPTED');

    // Capacity must remain exactly 1
    const updatedEvt = await prisma.event.findUnique({ where: { id: promoEvent.id } });
    expect(updatedEvt.currentRegistered).toBe(1);
  });

  // ==========================================
  // TEST 6: Transaction Rollback
  // ==========================================
  it('Test 6: Transaction Rollback – Error inside transaction leaves zero partial records in PostgreSQL', async () => {
    const rollbackEvent = await prisma.event.create({
      data: {
        title: `PG Rollback Event ${Date.now()}`,
        description: 'Transaction rollback test',
        startDate: new Date(Date.now() + 86400 * 1000),
        maxCapacity: 10,
        currentRegistered: 0,
        status: 'PUBLISHED',
        organizerId: organizerUser.id,
        categoryId,
        locationId,
      },
    });

    const user = await request(app).post('/api/auth/register').send({
      fullName: 'Rollback User',
      email: `rollback_${Date.now()}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
    });

    // Execute intentional transaction failure: create registration, then throw error
    let errorCaught = false;
    try {
      await prisma.$transaction(async (tx) => {
        // Step 1: Create registration
        await tx.registration.create({
          data: {
            eventId: rollbackEvent.id,
            userId: user.body.user.id,
            ticketCode: `EVT-RB-${Date.now().toString().slice(-4)}`,
            status: 'CONFIRMED',
          },
        });

        // Step 2: Increment event count
        await tx.event.update({
          where: { id: rollbackEvent.id },
          data: { currentRegistered: { increment: 1 } },
        });

        // Step 3: Intentional abort / crash
        throw new Error('SIMULATED_TRANSACTION_FAILURE');
      });
    } catch (err) {
      if (err.message === 'SIMULATED_TRANSACTION_FAILURE') {
        errorCaught = true;
      }
    }

    expect(errorCaught).toBe(true);

    // Verify PostgreSQL atomicity: zero registrations exist for this user & event
    const regCheck = await prisma.registration.findUnique({
      where: { userId_eventId: { userId: user.body.user.id, eventId: rollbackEvent.id } },
    });
    expect(regCheck).toBeNull();

    // Event capacity remains exactly 0
    const evtCheck = await prisma.event.findUnique({ where: { id: rollbackEvent.id } });
    expect(evtCheck.currentRegistered).toBe(0);
  });

  // ==========================================
  // TEST 7: Concurrent Event Update & Registration
  // ==========================================
  it('Test 7: Concurrent Event Update & Registration – Organizer update while registration in-flight maintains invariants', async () => {
    const concurrentEvt = await prisma.event.create({
      data: {
        title: `PG Concurrent Update Event ${Date.now()}`,
        description: 'Concurrent modification test',
        startDate: new Date(Date.now() + 86400 * 1000),
        maxCapacity: 5,
        currentRegistered: 2,
        status: 'PUBLISHED',
        organizerId: organizerUser.id,
        categoryId,
        locationId,
      },
    });

    const user = await request(app).post('/api/auth/register').send({
      fullName: 'In-Flight Booker',
      email: `inflight_${Date.now()}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
    });

    // Fire simultaneous registration and event details update
    const [regRes, updateRes] = await Promise.all([
      request(app)
        .post(`/api/events/${concurrentEvt.id}/register`)
        .set('Authorization', `Bearer ${user.body.token}`),
      request(app)
        .put(`/api/events/${concurrentEvt.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: `Updated Title ${Date.now()}`,
          description: 'Updated description during live registration',
          maxCapacity: 10,
        }),
    ]);

    expect([200, 201]).toContain(regRes.status);
    expect([200, 201]).toContain(updateRes.status);

    const finalEvt = await prisma.event.findUnique({ where: { id: concurrentEvt.id } });
    expect(finalEvt.currentRegistered).toBe(3);
    expect(finalEvt.maxCapacity).toBe(10);
  });
});

