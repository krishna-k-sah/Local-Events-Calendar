import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { generateTicketToken } from '../src/controllers/ticketController.js';

describe('Phase 5.2 – Load, Concurrency & High-Stress Integrity Suite', () => {
  let organizerToken;
  let organizerUser;
  let categoryId;
  let locationId;

  // Store performance telemetry
  const performanceLogs = [];

  const logLatency = (scenarioName, durations) => {
    durations.sort((a, b) => a - b);
    const min = durations[0];
    const max = durations[durations.length - 1];
    const mean = Math.round(durations.reduce((acc, d) => acc + d, 0) / durations.length);
    const p95 = durations[Math.floor(durations.length * 0.95)] || max;
    const p99 = durations[Math.floor(durations.length * 0.99)] || max;

    const stats = { scenarioName, count: durations.length, min, max, mean, p95, p99 };
    performanceLogs.push(stats);
    return stats;
  };

  beforeAll(async () => {
    // 1. Fetch Organizer Token
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

  // ==========================================
  // 1. CONCURRENT REGISTRATION STRESS TEST
  // ==========================================
  describe('High-Concurrency Registration Race Condition', () => {
    it('should strictly admit 1 user and reject 9 users when 1 seat remains under 10 concurrent requests', async () => {
      // Create event with maxCapacity = 1
      const limitedEvent = await prisma.event.create({
        data: {
          title: `Load Test Flash Sale Event ${Date.now()}`,
          description: 'Single seat flash registration stress test.',
          startDate: new Date(Date.now() + 7 * 86400 * 1000),
          endDate: new Date(Date.now() + 7 * 86400 * 1000 + 7200000),
          registrationDeadline: new Date(Date.now() + 6 * 86400 * 1000),
          maxCapacity: 1,
          currentRegistered: 0,
          status: 'PUBLISHED',
          organizerId: organizerUser.id,
          categoryId,
          locationId,
        },
      });

      // Provision 10 distinct attendee accounts
      const attendeeTokens = [];
      const batchTime = Date.now();
      for (let i = 0; i < 10; i++) {
        const reg = await request(app).post('/api/auth/register').send({
          fullName: `Stress User ${i}`,
          email: `stress_reg_${batchTime}_${i}@test.com`,
          password: 'password123',
          role: 'ATTENDEE',
        });
        attendeeTokens.push(reg.body.token);
      }

      // Execute 10 simultaneous registration requests
      const durations = [];
      const responses = await Promise.all(
        attendeeTokens.map(async (token) => {
          const start = Date.now();
          const res = await request(app)
            .post(`/api/events/${limitedEvent.id}/register`)
            .set('Authorization', `Bearer ${token}`);
          durations.push(Date.now() - start);
          return res;
        })
      );

      const stats = logLatency('Concurrent Registration (10 users -> 1 seat)', durations);

      const successResponses = responses.filter((r) => r.status === 201);
      const capacityFullResponses = responses.filter((r) => r.status === 400);

      // Verify exact capacity invariant: exactly 1 success, 9 rejections
      expect(successResponses.length).toBe(1);
      expect(capacityFullResponses.length).toBe(9);
      capacityFullResponses.forEach((res) => {
        expect(res.body.message).toContain('Registration is full');
      });

      // Verify database invariant
      const freshEvent = await prisma.event.findUnique({
        where: { id: limitedEvent.id },
      });
      expect(freshEvent.currentRegistered).toBe(1);

      const totalDbRegs = await prisma.registration.count({
        where: { eventId: limitedEvent.id, status: 'CONFIRMED' },
      });
      expect(totalDbRegs).toBe(1);

      // Performance check: mean latency under concurrent test execution
      expect(stats.mean).toBeLessThan(3000);
    }, 15000);
  });

  // ==========================================
  // 2. CONCURRENT DOOR SCANNER STRESS TEST
  // ==========================================
  describe('High-Concurrency Door Check-In Race Condition', () => {
    it('should atomically check-in 1 scan and reject 5 simultaneous duplicate door scans with 409 Conflict', async () => {
      // Create event and registered ticket
      const doorEvent = await prisma.event.create({
        data: {
          title: `Door Scan Stress Event ${Date.now()}`,
          description: 'High concurrency door check-in scanner test.',
          startDate: new Date(Date.now() + 86400 * 1000),
          endDate: new Date(Date.now() + 86400 * 1000 + 7200000),
          maxCapacity: 50,
          currentRegistered: 1,
          status: 'PUBLISHED',
          organizerId: organizerUser.id,
          categoryId,
          locationId,
        },
      });

      // Register 1 user
      const time = Date.now();
      const att = await request(app).post('/api/auth/register').send({
        fullName: 'VIP Attendee',
        email: `vip_${time}@test.com`,
        password: 'password123',
        role: 'ATTENDEE',
      });

      const ticketRes = await request(app)
        .post(`/api/events/${doorEvent.id}/register`)
        .set('Authorization', `Bearer ${att.body.token}`);

      const ticketCode = ticketRes.body.data.ticketCode;
      const signedToken = generateTicketToken(ticketCode, doorEvent.id);

      // Fire 6 simultaneous scan requests for this exact ticket
      const durations = [];
      const scanPromises = Array.from({ length: 6 }).map(async () => {
        const start = Date.now();
        const res = await request(app)
          .post('/api/attendance/scan')
          .set('Authorization', `Bearer ${organizerToken}`)
          .send({
            ticketCodeOrToken: signedToken,
            eventId: doorEvent.id,
            method: 'QR',
          });
        durations.push(Date.now() - start);
        return res;
      });

      const scanResults = await Promise.all(scanPromises);
      const stats = logLatency('Concurrent Door Check-In (6 simultaneous scans)', durations);

      const successfulScans = scanResults.filter((r) => r.status === 200);
      const conflictScans = scanResults.filter((r) => r.status === 409);

      // Exactly 1 must succeed, 5 must be rejected with 409 Conflict
      expect(successfulScans.length).toBe(1);
      expect(conflictScans.length).toBe(5);
      conflictScans.forEach((r) => {
        expect(r.body.message).toMatch(/DUPLICATE SCAN|already checked in/i);
      });

      // Verify database invariant: Attendance record count = 1
      const attendanceCount = await prisma.attendance.count({
        where: {
          registration: { ticketCode },
        },
      });
      expect(attendanceCount).toBe(1);

      // Performance check
      expect(stats.mean).toBeLessThan(500);
    });
  });

  // ==========================================
  // 3. CONCURRENT WAITLIST ENQUEUE STRESS TEST
  // ==========================================
  describe('High-Concurrency Waitlist Enqueue Race Condition', () => {
    it('should assign strictly sequential, collision-free waitlist positions (#1 through #6) under simultaneous joins', async () => {
      // Create a full event (maxCapacity = 0 / full)
      const fullEvent = await prisma.event.create({
        data: {
          title: `Waitlist Stress Event ${Date.now()}`,
          description: 'Waitlist concurrency stress test.',
          startDate: new Date(Date.now() + 86400 * 1000),
          endDate: new Date(Date.now() + 86400 * 1000 + 7200000),
          maxCapacity: 2,
          currentRegistered: 2,
          status: 'PUBLISHED',
          organizerId: organizerUser.id,
          categoryId,
          locationId,
        },
      });

      // Provision 6 distinct waitlist attendees
      const waitlistAttendees = [];
      const batchTime = Date.now();
      for (let i = 0; i < 6; i++) {
        const user = await request(app).post('/api/auth/register').send({
          fullName: `Waitlister ${i}`,
          email: `waitlist_${batchTime}_${i}@test.com`,
          password: 'password123',
          role: 'ATTENDEE',
        });
        waitlistAttendees.push(user.body.token);
      }

      // Simultaneously join the waitlist
      const durations = [];
      const waitlistResponses = await Promise.all(
        waitlistAttendees.map(async (token) => {
          const start = Date.now();
          const res = await request(app)
            .post(`/api/events/${fullEvent.id}/waitlist`)
            .set('Authorization', `Bearer ${token}`);
          durations.push(Date.now() - start);
          return res;
        })
      );

      const stats = logLatency('Concurrent Waitlist Joins (6 simultaneous users)', durations);

      // All 6 should successfully join
      expect(waitlistResponses.every((r) => r.status === 201)).toBe(true);

      // Collect returned positions
      const positions = waitlistResponses.map((r) => r.body.data.position).sort((a, b) => a - b);

      // Assert collision-free, strictly sequential positions: [1, 2, 3, 4, 5, 6]
      expect(positions).toEqual([1, 2, 3, 4, 5, 6]);

      // Verify database records
      const dbEntries = await prisma.waitlist.findMany({
        where: { eventId: fullEvent.id, status: 'PENDING' },
        orderBy: { position: 'asc' },
      });
      expect(dbEntries.length).toBe(6);
      expect(dbEntries.map((e) => e.position)).toEqual([1, 2, 3, 4, 5, 6]);

      expect(stats.mean).toBeLessThan(500);
    });
  });
});

