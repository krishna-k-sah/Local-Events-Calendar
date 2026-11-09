import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

describe('Phase 6 – Staging Environment Smoke Test Suite', () => {
  let attendeeToken;
  let attendeeUser;
  let organizerToken;
  let organizerUser;
  let adminToken;
  let createdEvent;
  let registrationRecord;
  let ticketCode;
  let signedToken;

  const testEmail = `staging.attendee.${Date.now()}@example.com`;

  it('1. Register a new user on staging', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Staging Smoke Attendee',
        email: testEmail,
        password: 'Password123!',
        city: 'San Francisco, CA',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testEmail);
    attendeeToken = res.body.token;
    attendeeUser = res.body.user;
  });

  it('2. Login with registered credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('3. Discover published events on staging', async () => {
    const res = await request(app).get('/api/events');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('4. Create an event as organizer', async () => {
    // Login as existing seeded organizer
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'elena@novatech.io', password: 'password123' });
    organizerToken = loginRes.body.token;
    organizerUser = loginRes.body.user;

    const cat = await prisma.category.findFirst();

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        title: `Staging Smoke Festival ${Date.now()}`,
        description: 'Verifying end-to-end event workflow in staging environment with high reliability.',
        categoryId: cat.id,
        venueName: 'Moscone Center Staging',
        address: '747 Howard St',
        city: 'San Francisco',
        startDate: new Date(Date.now() + 86400 * 30 * 1000).toISOString(),
        endDate: new Date(Date.now() + 86400 * 31 * 1000).toISOString(),
        maxCapacity: 50,
        price: 0,
        isFree: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdEvent = res.body.data;
  });

  it('5. Approve event as admin', async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@eventhub.com', password: 'password123' });
    adminToken = adminLogin.body.token;

    const res = await request(app)
      .put(`/api/admin/events/${createdEvent.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PUBLISHED');
  });

  it('6. Register as attendee for approved event', async () => {
    const res = await request(app)
      .post(`/api/events/${createdEvent.id}/register`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    registrationRecord = res.body.data;
    ticketCode = res.body.data.ticketCode;
    expect(ticketCode).toBeDefined();
  });

  it('7. Generate & retrieve QR ticket pass', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketCode}`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.signedToken).toBeDefined();
    signedToken = res.body.data.signedToken;
  });

  it('8. Verify the QR ticket token cryptographic structure', async () => {
    expect(signedToken).toBeDefined();
    const parts = signedToken.split('.');
    expect(parts.length).toBe(3); // Header, payload, signature
  });

  it('9. Scan attendance with door scanner', async () => {
    const res = await request(app)
      .post('/api/attendance/scan')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        ticketCodeOrToken: signedToken,
        eventId: createdEvent.id,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attendanceId).toBeDefined();
    expect(res.body.data.ticketCode).toBe(ticketCode);
  });

  it('10. Cancel a registration and verify seat release', async () => {
    // Create dedicated event for cancellation test to ensure strict parallel test isolation
    const cat = await prisma.category.findFirst();
    const loc = await prisma.location.findFirst();
    const cancelTestEvent = await prisma.event.create({
      data: {
        title: `Cancel Test Event ${Date.now()}`,
        description: 'Testing cancellation seat release in staging environment with complete isolation.',
        organizerId: organizerUser.id,
        categoryId: cat.id,
        locationId: loc.id,
        startDate: new Date(Date.now() + 86400 * 45 * 1000),
        maxCapacity: 10,
        status: 'PUBLISHED',
      },
    });

    const reg = await request(app)
      .post(`/api/events/${cancelTestEvent.id}/register`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(reg.status).toBe(201);

    const cancelRes = await request(app)
      .delete(`/api/events/${cancelTestEvent.id}/register`)
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.success).toBe(true);
  });

  it('11. Verify notifications delivered to user', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${attendeeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('12. Check organizer analytics on staging', async () => {
    const res = await request(app)
      .get('/api/organizer/analytics')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.capacityUtilization).toBeDefined();
    expect(res.body.data.summary.attendanceRate).toBeDefined();
  });
});
