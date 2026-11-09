import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';
import { generateSecureTicketCode } from '../src/utils/ticketGenerator.js';
import { generateTicketToken } from '../src/controllers/ticketController.js';

describe('Ticket Security, Entropy, Collision Safety & Authorization Suite', () => {
  let organizerToken;
  let organizerUser;
  let attendee1Token;
  let attendee1User;
  let attendee2Token;
  let attendee2User;
  let category;
  let location;
  let testEvent;

  beforeAll(async () => {
    // 1. Resolve Category and Location
    category = await prisma.category.findFirst();
    location = await prisma.location.findFirst();

    // 2. Fetch or prepare organizer
    const orgLogin = await request(app).post('/api/auth/login').send({
      email: 'elena@novatech.io',
      password: 'password123',
    });
    organizerToken = orgLogin.body.token;
    organizerUser = orgLogin.body.user;

    // 3. Register fresh attendees
    const time = Date.now();
    const att1 = await request(app).post('/api/auth/register').send({
      fullName: 'Sec Alice',
      email: `secalice_${time}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
    });
    attendee1Token = att1.body.token;
    attendee1User = att1.body.user;

    const att2 = await request(app).post('/api/auth/register').send({
      fullName: 'Sec Bob',
      email: `secbob_${time}@test.com`,
      password: 'password123',
      role: 'ATTENDEE',
    });
    attendee2Token = att2.body.token;
    attendee2User = att2.body.user;

    // 4. Create isolated event for test suite
    testEvent = await prisma.event.create({
      data: {
        title: `Ticket Security Event ${Date.now()}`,
        description: 'Comprehensive ticket security & regression test event',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
        status: 'PUBLISHED',
        maxCapacity: 50,
        currentRegistered: 0,
        organizerId: organizerUser.id,
        categoryId: category.id,
        locationId: location.id,
      },
    });
  });

  it('1. Normal ticket generation produces valid high-entropy format (EVT-XXXXXX-XXXXXX-XXXXXX)', async () => {
    const regRes = await request(app)
      .post(`/api/events/${testEvent.id}/register`)
      .set('Authorization', `Bearer ${attendee1Token}`);

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    const code = regRes.body.data.ticketCode;
    expect(code).toBeDefined();
    // Validate format: EVT- followed by four 6-hex blocks (24 hex characters = 96 bits entropy)
    expect(code).toMatch(/^EVT-[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}$/);

    // Verify database record has valid status and matches code
    const dbReg = await prisma.registration.findUnique({
      where: { ticketCode: code },
    });
    expect(dbReg).toBeDefined();
    expect(dbReg.userId).toBe(attendee1User.id);
    expect(dbReg.status).toBe('CONFIRMED');
    expect(dbReg.ticketStatus).toBe('VALID');
  });

  it('2. Large batch generation yields 0 collisions across 500 generated codes', async () => {
    const generatedCodes = new Set();
    const batchSize = 500;

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < batchSize; i++) {
        const code = await generateSecureTicketCode(tx);
        generatedCodes.add(code);
      }
    });

    expect(generatedCodes.size).toBe(batchSize);
  });

  it('3. Duplicate collision simulation safely retries and returns non-colliding candidate', async () => {
    let callCount = 0;
    const fakeCandidate = 'EVT-AAAAAA-BBBBBB-CCCCCC';

    // Mock tx client with simulated collision on first query
    const mockTx = {
      registration: {
        findUnique: async ({ where }) => {
          callCount++;
          if (callCount === 1) {
            // Simulate existing ticket code collision on first check
            return { id: 'existing-collision-id' };
          }
          // Second check succeeds (no collision)
          return null;
        },
      },
    };

    const code = await generateSecureTicketCode(mockTx, 5);
    expect(code).toMatch(/^EVT-[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}-[0-9A-F]{6}$/);
    expect(callCount).toBe(2); // Confirms retry was triggered on collision
  });

  it('4. Concurrent ticket creation assigns distinct, unique ticket codes with DB constraint verification', async () => {
    // Create dedicated event with capacity for 5
    const concurrentEvent = await prisma.event.create({
      data: {
        title: `Concurrent Tickets ${Date.now()}`,
        description: 'Testing parallel ticket issuance',
        startDate: new Date(Date.now() + 86400000),
        status: 'PUBLISHED',
        maxCapacity: 10,
        organizerId: organizerUser.id,
        categoryId: category.id,
        locationId: location.id,
      },
    });

    // Create 5 temporary users for parallel registration
    const tempUsers = [];
    const tokens = [];
    for (let i = 0; i < 5; i++) {
      const email = `conc_ticket_user_${Date.now()}_${i}@test.com`;
      const regRes = await request(app).post('/api/auth/register').send({
        email,
        password: 'password123',
        fullName: `Ticket Tester ${i}`,
        role: 'ATTENDEE',
      });
      tempUsers.push(regRes.body.user);
      tokens.push(regRes.body.token);
    }

    // Fire 5 registrations in parallel
    const responses = await Promise.all(
      tokens.map((t) =>
        request(app)
          .post(`/api/events/${concurrentEvent.id}/register`)
          .set('Authorization', `Bearer ${t}`)
      )
    );

    const ticketCodes = [];
    for (const res of responses) {
      expect(res.status).toBe(201);
      expect(res.body.data.ticketCode).toBeDefined();
      ticketCodes.push(res.body.data.ticketCode);
    }

    // Assert all 5 ticket codes are completely distinct
    const uniqueCodes = new Set(ticketCodes);
    expect(uniqueCodes.size).toBe(5);

    // Assert all 5 are recorded in DB with unique constraint
    const dbRegistrations = await prisma.registration.findMany({
      where: { ticketCode: { in: ticketCodes } },
    });
    expect(dbRegistrations.length).toBe(5);
  });

  it('5. Invalid ticket verification rejects forged and non-existent codes', async () => {
    // 5a. Direct non-existent ticket query
    const res = await request(app)
      .get('/api/tickets/EVT-NONEXISTENT-999999')
      .set('Authorization', `Bearer ${attendee1Token}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    // 5b. Door scanner check with forged ticket token
    const forgedToken = generateTicketToken('EVT-NONEXISTENT-999999', testEvent.id);
    const scanRes = await request(app)
      .post('/api/attendance/scan')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        ticketCodeOrToken: forgedToken,
        eventId: testEvent.id,
      });
    expect(scanRes.status).toBe(404);
    expect(scanRes.body.message).toContain('No registration found');
  });

  it('6. Cancelled registration marks ticket CANCELLED and door scanner rejects check-in', async () => {
    // Attendee 2 registers for testEvent
    const regRes = await request(app)
      .post(`/api/events/${testEvent.id}/register`)
      .set('Authorization', `Bearer ${attendee2Token}`);
    expect(regRes.status).toBe(201);
    const ticketCode = regRes.body.data.ticketCode;

    // Attendee 2 cancels registration
    const cancelRes = await request(app)
      .delete(`/api/events/${testEvent.id}/register`)
      .set('Authorization', `Bearer ${attendee2Token}`);
    expect(cancelRes.status).toBe(200);

    // Verify DB state
    const dbReg = await prisma.registration.findUnique({
      where: { ticketCode },
    });
    expect(dbReg.status).toBe('CANCELLED');
    expect(dbReg.ticketStatus).toBe('CANCELLED');

    // Attempt to scan cancelled ticket
    const signedPass = generateTicketToken(ticketCode, testEvent.id);
    const scanRes = await request(app)
      .post('/api/attendance/scan')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        ticketCodeOrToken: signedPass,
        eventId: testEvent.id,
      });
    expect(scanRes.status).toBe(400);
    expect(scanRes.body.message).toContain('cancelled');
  });

  it('7. Repeated QR scans: initial scan succeeds (200), duplicate scan is rejected with 409 Conflict', async () => {
    // Fetch attendee1 registration
    const reg = await prisma.registration.findUnique({
      where: { userId_eventId: { userId: attendee1User.id, eventId: testEvent.id } },
    });
    const signedPass = generateTicketToken(reg.ticketCode, testEvent.id);

    // First scan: should succeed
    const scan1 = await request(app)
      .post('/api/attendance/scan')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        ticketCodeOrToken: signedPass,
        eventId: testEvent.id,
      });
    expect(scan1.status).toBe(200);
    expect(scan1.body.success).toBe(true);

    // Second scan with same token: must fail with 409 Conflict
    const scan2 = await request(app)
      .post('/api/attendance/scan')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        ticketCodeOrToken: signedPass,
        eventId: testEvent.id,
      });
    expect(scan2.status).toBe(409);
    expect(scan2.body.duplicate).toBe(true);
    expect(scan2.body.message).toContain('DUPLICATE SCAN');
  });

  it('8. Unauthorized ticket access: attendee B cannot inspect attendee A ticket details (403 Forbidden)', async () => {
    const reg = await prisma.registration.findUnique({
      where: { userId_eventId: { userId: attendee1User.id, eventId: testEvent.id } },
    });

    // Attendee 2 attempts to query Attendee 1's ticket
    const res = await request(app)
      .get(`/api/tickets/${reg.ticketCode}`)
      .set('Authorization', `Bearer ${attendee2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Forbidden');
  });
});
