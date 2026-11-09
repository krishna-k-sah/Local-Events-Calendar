import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { generateTicketToken } from '../src/controllers/ticketController.js';

describe('Phase 5 – Advanced Event Management and Intelligence Integration Tests', () => {
  let adminToken;
  let organizerToken;
  let attendee1Token;
  let attendee2Token;
  let attendee3Token;

  let organizerUser;
  let attendee1User;
  let attendee2User;
  let attendee3User;

  let testEvent;
  let testRegistration;
  let fullEvent;

  beforeAll(async () => {
    // 1. Fetch Admin
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@eventhub.com' },
      include: { role: true },
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'admin@eventhub.com',
      password: 'password123',
    });
    adminToken = loginRes.body.token;

    // 2. Fetch Organizer
    const orgLogin = await request(app).post('/api/auth/login').send({
      email: 'elena@novatech.io',
      password: 'password123',
    });
    organizerToken = orgLogin.body.token;
    organizerUser = orgLogin.body.user;

    // 3. Register fresh attendees
    const time = Date.now();
    const att1 = await request(app).post('/api/auth/register').send({
      fullName: 'Alice Walker',
      email: `alice_${time}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
      city: 'San Francisco',
    });
    attendee1Token = att1.body.token;
    attendee1User = att1.body.user;

    const att2 = await request(app).post('/api/auth/register').send({
      fullName: 'Bob Martinez',
      email: `bob_${time}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
      city: 'San Francisco',
    });
    attendee2Token = att2.body.token;
    attendee2User = att2.body.user;

    const att3 = await request(app).post('/api/auth/register').send({
      fullName: 'Charlie Davis',
      email: `charlie_${time}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
      city: 'San Francisco',
    });
    attendee3Token = att3.body.token;
    attendee3User = att3.body.user;

    const location = await prisma.location.findFirst();
    const category = await prisma.category.findFirst();

    // Create an event for organizer
    testEvent = await prisma.event.create({
      data: {
        title: `AI & Tech Summit ${time}`,
        description: 'Deep dive into emerging intelligence.',
        organizerId: organizerUser.id,
        categoryId: category.id,
        locationId: location.id,
        startDate: new Date(Date.now() + 23.5 * 3600 * 1000), // In 23.5 hours for reminder test
        endDate: new Date(Date.now() + 27 * 3600 * 1000),
        maxCapacity: 50,
        currentRegistered: 0,
        status: 'PUBLISHED',
      },
    });

    // Register attendee 1 for testEvent
    const regRes = await request(app)
      .post(`/api/events/${testEvent.id}/register`)
      .set('Authorization', `Bearer ${attendee1Token}`);
    testRegistration = regRes.body.data;

    // Also register attendee 3 for testEvent so one confirmed registration remains after attendee 1 attends
    await request(app)
      .post(`/api/events/${testEvent.id}/register`)
      .set('Authorization', `Bearer ${attendee3Token}`);

    // Create a 1-capacity event for waitlist & auto-promotion test
    fullEvent = await prisma.event.create({
      data: {
        title: `Exclusive VIP Round Table ${time}`,
        description: 'Only one seat available.',
        organizerId: organizerUser.id,
        categoryId: category.id,
        locationId: location.id,
        startDate: new Date(Date.now() + 48 * 3600 * 1000),
        maxCapacity: 1,
        currentRegistered: 0,
        status: 'PUBLISHED',
      },
    });

    // Register attendee 1 to fill the single seat
    await request(app)
      .post(`/api/events/${fullEvent.id}/register`)
      .set('Authorization', `Bearer ${attendee1Token}`);
  });

  // ==========================================
  // 1. QR EVENT TICKETS & VERIFICATION
  // ==========================================
  describe('QR Event Ticket Generation & Details', () => {
    it('should return ticket details with signed cryptographic token for ticket owner', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testRegistration.ticketCode}`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketCode).toBe(testRegistration.ticketCode);
      expect(res.body.data.ticketStatus).toBe('VALID');
      expect(res.body.data.signedToken).toBeDefined();
      expect(res.body.data.signedToken.split('.').length).toBe(3); // Valid JWT structure
      expect(res.body.data.attendee.fullName).toBe('Alice Walker');
    });

    it('should allow event organizer to inspect attendee ticket', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testRegistration.ticketCode}`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ticketCode).toBe(testRegistration.ticketCode);
    });

    it('should forbid unrelated attendee from accessing another user ticket', async () => {
      const res = await request(app)
        .get(`/api/tickets/${testRegistration.ticketCode}`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // 2. QR ATTENDANCE SCANNER & CHECK-IN
  // ==========================================
  describe('Attendance Scanner & Duplicate Prevention', () => {
    it('should allow organizer to scan ticket with signed token and confirm check-in', async () => {
      const signedToken = generateTicketToken(
        testRegistration.ticketCode,
        testEvent.id,
        attendee1User.id
      );

      const res = await request(app)
        .post('/api/attendance/scan')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          ticketCodeOrToken: signedToken,
          eventId: testEvent.id,
          method: 'QR',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attendee.fullName).toBe('Alice Walker');
      expect(res.body.data.method).toBe('QR');

      // Verify registration is now USED / ATTENDED
      const updatedReg = await prisma.registration.findUnique({
        where: { ticketCode: testRegistration.ticketCode },
      });
      expect(updatedReg.status).toBe('ATTENDED');
      expect(updatedReg.ticketStatus).toBe('USED');
    });

    it('should reject duplicate scan attempt with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/attendance/scan')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          ticketCodeOrToken: testRegistration.ticketCode,
          eventId: testEvent.id,
          method: 'MANUAL',
        });

      expect(res.status).toBe(409);
      expect(res.body.duplicate).toBe(true);
      expect(res.body.message).toContain('DUPLICATE SCAN');
    });

    it('should prevent non-organizer from scanning tickets (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/attendance/scan')
        .set('Authorization', `Bearer ${attendee2Token}`)
        .send({
          ticketCodeOrToken: testRegistration.ticketCode,
          eventId: testEvent.id,
        });

      expect(res.status).toBe(403);
    });

    it('should return attendance roster and metrics for organizer', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent.id}/attendance`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalRegistered).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalAttended).toBe(1);
      expect(res.body.data.attendanceRate).toBeGreaterThanOrEqual(50);
      expect(res.body.data.roster.some((r) => r.isCheckedIn)).toBe(true);
    });

    it('should stream attendance roster as CSV', async () => {
      const res = await request(app)
        .get(`/api/events/${testEvent.id}/attendance/export`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Ticket Code,Attendee Name,Email');
      expect(res.text).toContain('Alice Walker');
    });
  });

  // ==========================================
  // 3. WAITLIST MANAGEMENT & AUTO-PROMOTION
  // ==========================================
  describe('Waitlist Management & Auto-Promotion Engine', () => {
    it('should reject joining waitlist if seats are still available', async () => {
      const res = await request(app)
        .post(`/api/events/${testEvent.id}/waitlist`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Seats are still available');
    });

    it('should allow attendee 2 to join waitlist for full event at position #1', async () => {
      const res = await request(app)
        .post(`/api/events/${fullEvent.id}/waitlist`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      expect(res.status).toBe(201);
      expect(res.body.data.position).toBe(1);
      expect(res.body.data.status).toBe('PENDING');
    });

    it('should allow attendee 3 to join waitlist for full event at position #2', async () => {
      const res = await request(app)
        .post(`/api/events/${fullEvent.id}/waitlist`)
        .set('Authorization', `Bearer ${attendee3Token}`);

      expect(res.status).toBe(201);
      expect(res.body.data.position).toBe(2);
    });

    it('should return waitlist status and user position', async () => {
      const res = await request(app)
        .get(`/api/events/${fullEvent.id}/waitlist/status`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.onWaitlist).toBe(true);
      expect(res.body.data.position).toBe(1);
      expect(res.body.data.totalWaitlist).toBe(2);
    });

    it('should automatically promote attendee 2 from waitlist when attendee 1 cancels', async () => {
      // Attendee 1 cancels registration on fullEvent
      const cancelRes = await request(app)
        .delete(`/api/events/${fullEvent.id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(cancelRes.status).toBe(200);

      // Verify Attendee 2 has been automatically promoted to CONFIRMED registration
      const promotedReg = await prisma.registration.findUnique({
        where: {
          userId_eventId: {
            userId: attendee2User.id,
            eventId: fullEvent.id,
          },
        },
      });

      expect(promotedReg).toBeDefined();
      expect(promotedReg.status).toBe('CONFIRMED');
      expect(promotedReg.ticketCode).toBeDefined();

      // Verify Attendee 2 waitlist status is now ACCEPTED
      const waitlist2 = await prisma.waitlist.findUnique({
        where: {
          userId_eventId: {
            userId: attendee2User.id,
            eventId: fullEvent.id,
          },
        },
      });
      expect(waitlist2.status).toBe('ACCEPTED');

      // Verify Attendee 3 shifted to position #1
      const waitlist3 = await prisma.waitlist.findUnique({
        where: {
          userId_eventId: {
            userId: attendee3User.id,
            eventId: fullEvent.id,
          },
        },
      });
      expect(waitlist3.position).toBe(1);
      expect(waitlist3.status).toBe('PENDING');

      // Check notification sent to Attendee 2
      const notif = await prisma.notification.findFirst({
        where: {
          userId: attendee2User.id,
          title: 'Promoted from Waitlist!',
        },
      });
      expect(notif).toBeDefined();
      expect(notif.message).toContain(fullEvent.title);
    });
  });

  // ==========================================
  // 4. AUTOMATED EVENT REMINDERS
  // ==========================================
  describe('Automated Event Reminders Engine', () => {
    it('should process upcoming events and dispatch 24H reminder idempotently', async () => {
      // testEvent was created with startDate in ~23.5 hours, and Attendee 1 is registered!
      const res = await request(app)
        .post('/api/reminders/trigger')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reminders24hSent).toBeGreaterThanOrEqual(1);

      // Second trigger should NOT send duplicates (idempotency guarantee)
      const res2 = await request(app)
        .post('/api/reminders/trigger')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.reminders24hSent).toBe(0);
    });
  });

  // ==========================================
  // 5. PERSONALIZED RECOMMENDATIONS
  // ==========================================
  describe('Personalized Recommendations Engine', () => {
    it('should return scored events with explainable reason badges for logged in user', async () => {
      const res = await request(app)
        .get('/api/recommendations')
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      if (res.body.data.length > 0) {
        const first = res.body.data[0];
        expect(first.recommendationScore).toBeDefined();
        expect(first.recommendationReason).toBeDefined();
        expect(typeof first.recommendationReason).toBe('string');
      }
    });

    it('should return trending events for unauthenticated visitors', async () => {
      const res = await request(app).get('/api/recommendations');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ==========================================
  // 6. ADVANCED ORGANIZER ANALYTICS
  // ==========================================
  describe('Organizer Advanced Analytics & Metrics', () => {
    it('should compute capacity utilization, attendance rate, waitlist metrics, and trends', async () => {
      const res = await request(app)
        .get('/api/organizer/analytics')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.summary.totalEvents).toBeGreaterThanOrEqual(1);
      expect(res.body.data.summary.capacityUtilization).toBeGreaterThanOrEqual(0);
      expect(res.body.data.summary.attendanceRate).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.data.eventPerformance)).toBe(true);
      expect(Array.isArray(res.body.data.registrationTrends)).toBe(true);
      expect(Array.isArray(res.body.data.categoryDistribution)).toBe(true);
    });
  });
});
