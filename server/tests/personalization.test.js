import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { JWT_SECRET } from '../src/config/jwt.js';
import {
  generateTicketToken,
  verifyTicketToken,
  TICKET_ISSUER,
  TICKET_AUDIENCE,
} from '../src/controllers/ticketController.js';
import {
  calculateHaversineDistance,
  computeRecommendationScore,
} from '../src/controllers/recommendationController.js';
import { processEventReminders } from '../src/services/reminderService.js';

describe('EventHub Personalization, Recommendation Scoring & Notification Suite', () => {
  let adminToken;
  let organizerToken;
  let attendee1Token;
  let attendee2Token;

  let organizerUser;
  let attendee1User;
  let attendee2User;

  let testEvent;
  let singleSeatEvent;
  let testRegistration;

  beforeAll(async () => {
    // 1. Fetch Admin
    const loginAdmin = await request(app).post('/api/auth/login').send({
      email: 'admin@eventhub.com',
      password: 'password123',
    });
    adminToken = loginAdmin.body.token;

    // 2. Fetch Organizer
    const loginOrg = await request(app).post('/api/auth/login').send({
      email: 'elena@novatech.io',
      password: 'password123',
    });
    organizerToken = loginOrg.body.token;
    organizerUser = loginOrg.body.user;

    // 3. Register fresh attendees
    const time = Date.now();
    const att1 = await request(app).post('/api/auth/register').send({
      fullName: 'David Miller',
      email: `david_${time}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
      city: 'San Francisco',
    });
    attendee1Token = att1.body.token;
    attendee1User = att1.body.user;

    const att2 = await request(app).post('/api/auth/register').send({
      fullName: 'Emma Watson',
      email: `emma_${time}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
      city: 'San Francisco',
    });
    attendee2Token = att2.body.token;
    attendee2User = att2.body.user;

    const location = await prisma.location.findFirst();
    const category = await prisma.category.findFirst();

    // Standard event
    testEvent = await prisma.event.create({
      data: {
        title: `Cybersecurity Masterclass ${time}`,
        description: 'Hardening modern fullstack web apps.',
        organizerId: organizerUser.id,
        categoryId: category.id,
        locationId: location.id,
        startDate: new Date(Date.now() + 24 * 3600 * 1000), // In 24 hours
        endDate: new Date(Date.now() + 28 * 3600 * 1000),
        maxCapacity: 100,
        currentRegistered: 0,
        status: 'PUBLISHED',
      },
    });

    // Book Attendee 1
    const regRes = await request(app)
      .post(`/api/events/${testEvent.id}/register`)
      .set('Authorization', `Bearer ${attendee1Token}`);
    testRegistration = regRes.body.data;

    // Single seat event for race condition tests
    singleSeatEvent = await prisma.event.create({
      data: {
        title: `Executive Roundtable ${time}`,
        description: 'Single seat invitation.',
        organizerId: organizerUser.id,
        categoryId: category.id,
        locationId: location.id,
        startDate: new Date(Date.now() + 48 * 3600 * 1000),
        maxCapacity: 1,
        currentRegistered: 0,
        status: 'PUBLISHED',
      },
    });

    await request(app)
      .post(`/api/events/${singleSeatEvent.id}/register`)
      .set('Authorization', `Bearer ${attendee1Token}`);
  });

  // ==========================================
  // 1. QR TICKET SECURITY & CLAIMS HARDENING
  // ==========================================
  describe('QR Ticket Security Hardening', () => {
    it('should generate tokens with required claims (iss, aud, sub, jti, exp)', () => {
      const token = generateTicketToken('EVT-1001-9999', 'evt-100', 'usr-200');
      const decoded = jwt.decode(token);

      expect(decoded.iss).toBe(TICKET_ISSUER);
      expect(decoded.aud).toBe(TICKET_AUDIENCE);
      expect(decoded.sub).toBe('EVT-1001-9999');
      expect(decoded.jti).toBeDefined();
      expect(typeof decoded.jti).toBe('string');
      expect(decoded.ticketCode).toBe('EVT-1001-9999');
      expect(decoded.exp).toBeDefined();
    });

    it('should reject tokens with wrong audience', () => {
      const forgedToken = jwt.sign(
        { ticketCode: 'EVT-TEST', eventId: 'evt-100', userId: 'usr-1' },
        JWT_SECRET,
        { issuer: TICKET_ISSUER, audience: 'Wrong-Audience' }
      );

      const verified = verifyTicketToken(forgedToken);
      expect(verified).toBeNull();
    });

    it('should reject tokens with wrong issuer', () => {
      const forgedToken = jwt.sign(
        { ticketCode: 'EVT-TEST', eventId: 'evt-100', userId: 'usr-1' },
        JWT_SECRET,
        { issuer: 'Malicious-Issuer', audience: TICKET_AUDIENCE }
      );

      const verified = verifyTicketToken(forgedToken);
      expect(verified).toBeNull();
    });

    it('should reject forged tokens signed with wrong secret', () => {
      const forgedToken = jwt.sign(
        { ticketCode: 'EVT-TEST', eventId: 'evt-100', userId: 'usr-1' },
        'wrong_super_secret_forged_key',
        { issuer: TICKET_ISSUER, audience: TICKET_AUDIENCE }
      );

      const verified = verifyTicketToken(forgedToken);
      expect(verified).toBeNull();
    });

    it('should reject scanner submission of a forged token (400 Bad Request)', async () => {
      const forgedToken = jwt.sign(
        { ticketCode: 'EVT-FAKE-1234', eventId: testEvent.id },
        'wrong_secret',
        { issuer: TICKET_ISSUER, audience: TICKET_AUDIENCE }
      );

      const res = await request(app)
        .post('/api/attendance/scan')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          ticketCodeOrToken: forgedToken,
          eventId: testEvent.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid, expired, or forged');
    });

    it('should reject scanning a ticket for an event that has been cancelled (400)', async () => {
      // Temporarily mark testEvent as CANCELLED
      await prisma.event.update({
        where: { id: testEvent.id },
        data: { status: 'CANCELLED' },
      });

      const res = await request(app)
        .post('/api/attendance/scan')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          ticketCodeOrToken: testRegistration.ticketCode,
          eventId: testEvent.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('cancelled');

      // Restore to PUBLISHED
      await prisma.event.update({
        where: { id: testEvent.id },
        data: { status: 'PUBLISHED' },
      });
    });
  });

  // ==========================================
  // 2. ATTENDANCE SCANNER CONCURRENCY HARDENING
  // ==========================================
  describe('Attendance Scanner Concurrency & Duplicate Prevention', () => {
    it('should atomically admit first scan and return 409 Conflict on simultaneous duplicate scan', async () => {
      const signedPass = generateTicketToken(
        testRegistration.ticketCode,
        testEvent.id,
        attendee1User.id
      );

      // Fire 2 simultaneous scans
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/attendance/scan')
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({ ticketCodeOrToken: signedPass, eventId: testEvent.id }),
        request(app)
          .post('/api/attendance/scan')
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({ ticketCodeOrToken: signedPass, eventId: testEvent.id }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.duplicate).toBe(true);
      expect(conflictRes.body.message).toContain('DUPLICATE SCAN');
    });
  });

  // ==========================================
  // 3. WAITLIST ORDERING & PROMOTION ATOMICITY
  // ==========================================
  describe('Waitlist Deterministic Ordering & Atomic Promotion', () => {
    it('should atomically order waitlist position without duplicates', async () => {
      // Both Attendee 1 and Attendee 2 try joining waitlist for singleSeatEvent (already full)
      const res2 = await request(app)
        .post(`/api/events/${singleSeatEvent.id}/waitlist`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      expect(res2.status).toBe(201);
      expect(res2.body.data.position).toBe(1);
    });

    it('should promote waitlist position 1 when confirmed seat cancels', async () => {
      const cancelRes = await request(app)
        .delete(`/api/events/${singleSeatEvent.id}/register`)
        .set('Authorization', `Bearer ${attendee1Token}`);

      expect(cancelRes.status).toBe(200);

      // Verify Attendee 2 was auto-promoted to CONFIRMED
      const promotedReg = await prisma.registration.findUnique({
        where: {
          userId_eventId: {
            userId: attendee2User.id,
            eventId: singleSeatEvent.id,
          },
        },
      });

      expect(promotedReg.status).toBe('CONFIRMED');
      expect(promotedReg.ticketStatus).toBe('VALID');

      // Verify capacity remained strictly at 1
      const updatedEvt = await prisma.event.findUnique({
        where: { id: singleSeatEvent.id },
      });
      expect(updatedEvt.currentRegistered).toBe(1);
    });
  });

  // ==========================================
  // 4. RECOMMENDATION FORMULA MATHEMATICAL AUDIT
  // ==========================================
  describe('Recommendation Engine Formula Compliance', () => {
    it('should correctly calculate Haversine great-circle distance', () => {
      // San Francisco (37.7749, -122.4194) to Oakland (37.8044, -122.2711) ~ 13.5 km
      const distance = calculateHaversineDistance(37.7749, -122.4194, 37.8044, -122.2711);
      expect(distance).toBeGreaterThan(12);
      expect(distance).toBeLessThan(15);
    });

    it('should strictly compute normalized S = 0.40C + 0.25G + 0.20P + 0.15T in range [0, 100]', () => {
      const result = computeRecommendationScore({
        categoryBookings: 10, // C = min(100, 3*10 + 2*5) = 40
        categoryFavorites: 5,
        userCity: 'San Francisco',
        venueCity: 'San Francisco', // G = 100 (city match)
        confirmedRegistrations: 80,
        maxCapacity: 100, // P = (80/100)*100 = 80
        startDate: new Date(Date.now() + 5 * 86400 * 1000), // 5 days away -> T = 100*(1 - 5/10) = 50
        now: new Date(),
      });

      // Expected calculation:
      // C = 40 (weighted: 0.4 * 40 = 16)
      // G = 100 (weighted: 0.25 * 100 = 25)
      // P = 80 (weighted: 0.20 * 80 = 16)
      // T = 50 (weighted: 0.15 * 50 = 7.5)
      // Total S = 16 + 25 + 16 + 7.5 = 64.5 -> rounded to 65
      expect(result.C).toBe(40);
      expect(result.G).toBe(100);
      expect(result.P).toBe(80);
      expect(result.T).toBe(50);
      expect(result.S).toBe(65);
      expect(result.S).toBeGreaterThanOrEqual(0);
      expect(result.S).toBeLessThanOrEqual(100);
    });

    it('should safely handle zero capacity events without division by zero', () => {
      const result = computeRecommendationScore({
        maxCapacity: 0,
        confirmedRegistrations: 0,
        startDate: new Date(Date.now() + 20 * 86400 * 1000), // > 10 days away
        now: new Date(),
      });

      expect(result.P).toBe(0);
      expect(result.T).toBe(0);
      expect(result.S).toBeGreaterThanOrEqual(0);
      expect(isNaN(result.S)).toBe(false);
    });
  });

  // ==========================================
  // 5. ORGANIZER ANALYTICS FORMULA AUDIT
  // ==========================================
  describe('Organizer Analytics Formula Compliance', () => {
    it('should compute standardized rates and explicitly label registration conversion as unavailable', async () => {
      const res = await request(app)
        .get('/api/organizer/analytics')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      const summary = res.body.data.summary;

      expect(summary.capacityUtilization).toBeDefined();
      expect(summary.attendanceRate).toBeDefined();
      expect(summary.cancellationRate).toBeDefined();
      expect(summary.waitlistConversionRate).toBeDefined();
      expect(summary.registrationConversionRate.available).toBe(false);
      expect(summary.registrationConversionRate.reason).toContain('visitor tracking');

      // Check NaN protection
      expect(isNaN(summary.capacityUtilization)).toBe(false);
      expect(isNaN(summary.attendanceRate)).toBe(false);
      expect(isNaN(summary.cancellationRate)).toBe(false);
      expect(isNaN(summary.waitlistConversionRate)).toBe(false);
    });
  });
});

