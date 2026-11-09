import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

describe('EventHub Comprehensive API Integration Test Suite', () => {
  let adminToken;
  let organizerToken;
  let organizer2Token;
  let attendeeToken;
  let attendee2Token;

  let createdEventId;
  let categoryId;
  let testOrganizerId;

  beforeAll(async () => {
    // 1. Fetch tokens for seeded test personas
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@eventhub.com', password: 'password123' });
    adminToken = adminRes.body.token;

    const orgRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'elena@novatech.io', password: 'password123' });
    organizerToken = orgRes.body.token;
    testOrganizerId = orgRes.body.user.id;

    const org2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'marcus@soundwave.live', password: 'password123' });
    organizer2Token = org2Res.body.token;

    const attRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sarah.j@gmail.com', password: 'password123' });
    attendeeToken = attRes.body.token;

    const att2Res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'david.chen@berkeley.edu', password: 'password123' });
    attendee2Token = att2Res.body.token;

    const cat = await prisma.category.findFirst();
    categoryId = cat.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // 1. AUTHENTICATION & SECURITY
  // =========================================================================
  describe('Authentication & Security', () => {
    it('should successfully register a new attendee with hashed password', async () => {
      const email = `newuser_${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Test New User',
          email,
          password: 'password123',
          role: 'ATTENDEE',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.role.name).toBe('ATTENDEE');
      expect(res.body.user.passwordHash).toBeUndefined(); // Never expose password hash
    });

    it('Audit Req 3: should prevent role escalation to ADMIN on public signup', async () => {
      const maliciousEmail = `hacker_${Date.now()}@exploit.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Privilege Escalation Attempt',
          email: maliciousEmail,
          password: 'password123',
          role: 'ADMIN', // Attempting to self-grant ADMIN role!
        });

      expect(res.status).toBe(201);
      // Public signup must force the role back to ATTENDEE
      expect(res.body.user.role.name).toBe('ATTENDEE');
      expect(res.body.user.role.name).not.toBe('ADMIN');
    });

    it('should reject registration with duplicate email address', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Duplicate User',
          email: 'admin@eventhub.com',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should successfully log in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@eventhub.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('admin@eventhub.com');
      expect(res.body.user.fullName).toBeDefined();
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@eventhub.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Audit Req 1: should reject expired JWT tokens', async () => {
      // Craft an expired JWT using standard test secret
      const JWT_SECRET = process.env.JWT_SECRET || 'eventhub-super-secret-jwt-key-2026-production';
      const expiredToken = jwt.sign(
        { userId: testOrganizerId, role: 'ORGANIZER' },
        JWT_SECRET,
        { expiresIn: '-10s' } // Expired 10 seconds ago
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Audit Req 2: should reject invalid or forged authentication tokens', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.forged.signature');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('Audit Req 12: should validate current password when changing password', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          currentPassword: 'incorrect-current-password',
          newPassword: 'brandNewPassword2026',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('incorrect');
    });
  });

  // =========================================================================
  // 2. ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION ISOLATION
  // =========================================================================
  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow Admin to access admin dashboard', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalEvents).toBeGreaterThan(0);
      expect(res.body.data.totalUsers).toBeGreaterThan(0);
    });

    it('should reject Attendee from accessing admin dashboard (403)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('should reject Organizer from accessing admin dashboard (403)', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // 3. EVENT CRUD & VALIDATION ENGINE
  // =========================================================================
  describe('Event Management & Validation Engine', () => {
    it('should allow Organizer to create a new event with valid future dates', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Automated Vitest Tech Conference',
          description: 'A comprehensive technical deep dive into Node.js and full-stack architecture.',
          categoryId,
          startDate: '2027-06-15T10:00:00Z',
          endDate: '2027-06-15T18:00:00Z',
          venueName: 'Civic Auditorium',
          address: '99 Grove St',
          city: 'San Francisco',
          maxCapacity: 100,
          isFree: false,
          price: 49.99,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Automated Vitest Tech Conference');
      createdEventId = res.body.data.id;
    });

    it('Audit Req 8: should reject event creation with past start date', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Past Event That Should Fail',
          description: 'This event is scheduled in the year 2020 and must be rejected.',
          categoryId,
          startDate: '2020-01-01T10:00:00Z',
          venueName: 'Retro Center',
          address: '100 Past Way',
          city: 'San Francisco',
          maxCapacity: 50,
          isFree: true,
          price: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Audit Req 8: should reject event creation when end date is before start date', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Time Travel Inverted Dates Event',
          description: 'Event where end date is chronologically before the start date.',
          categoryId,
          startDate: '2027-08-10T10:00:00Z',
          endDate: '2027-08-09T10:00:00Z', // 1 day before start!
          venueName: 'Time Warp Hall',
          address: '42 Relativity Lane',
          city: 'San Francisco',
          maxCapacity: 50,
          isFree: true,
          price: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Audit Req 4: should prevent cross-organizer event modification', async () => {
      // Organizer 2 attempts to edit Organizer 1's event
      const res = await request(app)
        .put(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${organizer2Token}`)
        .send({
          title: 'Malicious Cross-Organizer Hijack',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Audit Req 10: should reject normal attendee attempting to delete an event', async () => {
      const res = await request(app)
        .delete(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Audit Req 10: should reject cross-organizer event deletion', async () => {
      const res = await request(app)
        .delete(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${organizer2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow organizer to update their own event', async () => {
      const res = await request(app)
        .put(`/api/events/${createdEventId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Automated Vitest Tech Conference (Updated)',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Automated Vitest Tech Conference (Updated)');
    });

    it('should allow Admin to approve a pending event', async () => {
      const pendingEvt = await prisma.event.create({
        data: {
          title: 'Moderation Approval Test Event',
          description: 'Event waiting for admin approval.',
          categoryId,
          organizerId: testOrganizerId,
          locationId: (await prisma.location.findFirst()).id,
          startDate: new Date('2027-12-28T10:00:00Z'),
          status: 'PENDING',
        },
      });

      const res = await request(app)
        .put(`/api/admin/events/${pendingEvt.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PUBLISHED');
    });
  });

  // =========================================================================
  // 4. CONCURRENCY & REGISTRATION ISOLATION
  // =========================================================================
  describe('Event Registration, Concurrency & Isolation', () => {
    let singleSeatEvent;

    beforeAll(async () => {
      singleSeatEvent = await prisma.event.create({
        data: {
          title: 'Critical Concurrency 1-Seat Event',
          description: 'Testing simultaneous requests race condition on last remaining seat.',
          categoryId,
          organizerId: testOrganizerId,
          locationId: (await prisma.location.findFirst()).id,
          startDate: new Date('2027-09-30T10:00:00Z'),
          registrationDeadline: new Date('2027-09-29T23:59:59Z'),
          maxCapacity: 1, // Only 1 single seat available!
          currentRegistered: 0,
          status: 'PUBLISHED',
        },
      });
    });

    it('Audit Req 7: should safely handle concurrent registrations so only 1 succeeds', async () => {
      // Fire simultaneous registrations from Attendee 1 and Attendee 2 in parallel
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/events/${singleSeatEvent.id}/register`)
          .set('Authorization', `Bearer ${attendeeToken}`),
        request(app)
          .post(`/api/events/${singleSeatEvent.id}/register`)
          .set('Authorization', `Bearer ${attendee2Token}`),
      ]);

      const statuses = [res1.status, res2.status];
      // Exactly one must receive 201 Created and the other must receive 400 Bad Request (Capacity full)
      expect(statuses).toContain(201);
      expect(statuses).toContain(400);

      // Verify database integrity: event currentRegistered must equal exactly 1 (not 2!)
      const verifiedEvt = await prisma.event.findUnique({ where: { id: singleSeatEvent.id } });
      expect(verifiedEvt.currentRegistered).toBe(1);
    });

    it('Audit Section 3: should enforce strict capacity invariant across 3 simultaneous registrations', async () => {
      const raceEvent = await prisma.event.create({
        data: {
          title: 'High Concurrency Invariant Test',
          description: '3 concurrent attendees booking 1 remaining seat.',
          categoryId,
          organizerId: testOrganizerId,
          locationId: (await prisma.location.findFirst()).id,
          startDate: new Date('2027-10-10T10:00:00Z'),
          maxCapacity: 1,
          currentRegistered: 0,
          status: 'PUBLISHED',
        },
      });

      const att3Email = `attendee3_${Date.now()}@example.com`;
      const reg3 = await request(app).post('/api/auth/register').send({
        fullName: 'Attendee Three',
        email: att3Email,
        password: 'password123',
        role: 'ATTENDEE',
      });
      const attendee3Token = reg3.body.token;

      const results = await Promise.all([
        request(app).post(`/api/events/${raceEvent.id}/register`).set('Authorization', `Bearer ${attendeeToken}`),
        request(app).post(`/api/events/${raceEvent.id}/register`).set('Authorization', `Bearer ${attendee2Token}`),
        request(app).post(`/api/events/${raceEvent.id}/register`).set('Authorization', `Bearer ${attendee3Token}`),
      ]);

      const successCount = results.filter((r) => r.status === 201).length;
      const failureCount = results.filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(2);

      const updatedEvt = await prisma.event.findUnique({ where: { id: raceEvent.id } });
      expect(updatedEvt.currentRegistered).toBe(1);
    });

    it('Audit Req 6: should prevent Attendee 2 from cancelling Attendee 1 registration', async () => {
      // Attendee 2 attempts to cancel registration on the singleSeatEvent where Attendee 1 is booked
      const res = await request(app)
        .delete(`/api/events/${singleSeatEvent.id}/register`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      // Should return 404 since Attendee 2 does not own the active registration
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should allow legitimate attendee to cancel registration and free up capacity', async () => {
      const res = await request(app)
        .delete(`/api/events/${singleSeatEvent.id}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const verifiedEvt = await prisma.event.findUnique({ where: { id: singleSeatEvent.id } });
      expect(verifiedEvt.currentRegistered).toBe(0);
    });
  });

  // =========================================================================
  // 5. USER ISOLATION: NOTIFICATIONS & FAVORITES
  // =========================================================================
  describe('User Data Isolation (Notifications & Favorites)', () => {
    let attendee1NotificationId;

    beforeAll(async () => {
      // Clean and create fresh notification for attendee 1
      const user1 = await prisma.user.findFirst({ where: { email: 'sarah.j@gmail.com' } });
      const notif = await prisma.notification.create({
        data: {
          userId: user1.id,
          title: 'Private User 1 Notification',
          message: 'Sensitive user-specific alert message.',
          type: 'REGISTRATION_SUCCESS',
        },
      });
      attendee1NotificationId = notif.id;
    });

    it('Audit Req 5: should prevent User 2 from marking User 1 notification as read', async () => {
      const res = await request(app)
        .put(`/api/notifications/${attendee1NotificationId}/read`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('Audit Req 5: should prevent User 2 from deleting User 1 notification', async () => {
      const res = await request(app)
        .delete(`/api/notifications/${attendee1NotificationId}`)
        .set('Authorization', `Bearer ${attendee2Token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should toggle favorite event for logged in user', async () => {
      const user = await prisma.user.findFirst({ where: { email: 'sarah.j@gmail.com' } });
      await prisma.favorite.deleteMany({ where: { userId: user.id } });

      const event = await prisma.event.findFirst({ where: { status: 'PUBLISHED' } });

      // Add to favorites
      const addRes = await request(app)
        .post(`/api/events/${event.id}/favorite`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(addRes.status).toBe(200);
      expect(addRes.body.isFavorited).toBe(true);

      // List favorites
      const listRes = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.favoriteIds).toContain(event.id);
    });
  });

  // =========================================================================
  // 6. FILE UPLOAD SECURITY
  // =========================================================================
  describe('File Upload Security', () => {
    it('Audit Req 9: should reject non-image executable file uploads', async () => {
      const fakeExecutableBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00BinaryPayload');

      const res = await request(app)
        .post('/api/events/upload-poster')
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('poster', fakeExecutableBuffer, {
          filename: 'malicious.exe',
          contentType: 'application/octet-stream',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('INVALID_FILE_TYPE');
    });

    it('Audit Section 2: should reject malicious SVG image uploads', async () => {
      const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      const res = await request(app)
        .post('/api/events/upload-poster')
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('poster', svgBuffer, {
          filename: 'malicious.svg',
          contentType: 'image/svg+xml',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('MALICIOUS_SVG_REJECTED');
    });

    it('Audit Section 2: should reject MIME-spoofed file failing magic byte inspection', async () => {
      // Fake script disguised as .png with image/png content type
      const fakePhpBuffer = Buffer.from('<?php echo "malicious exploit payload"; ?>');
      const res = await request(app)
        .post('/api/events/upload-poster')
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('poster', fakePhpBuffer, {
          filename: 'disguised.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('MAGIC_BYTE_MISMATCH');
    });

    it('Audit Section 2: should reject unauthorized upload attempts without token (401)', async () => {
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/events/upload-poster')
        .attach('poster', pngBuffer, {
          filename: 'unauth.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should allow valid image uploads with verified extension and MIME type', async () => {
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );

      const res = await request(app)
        .post('/api/events/upload-poster')
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('poster', pngBuffer, {
          filename: 'valid-event-banner.png',
          contentType: 'image/png',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.url).toMatch(/^\/uploads\/poster-.*\.png$/);
    });
  });

  // =========================================================================
  // 7. ADMINISTRATION, CATEGORY CONSTRAINTS & CSV EXPORT
  // =========================================================================
  describe('Administration, Taxonomy Constraints & Reports', () => {
    it('Audit Req 13: should allow Admin to update user role', async () => {
      const testUser = await prisma.user.findFirst({ where: { email: 'david.chen@berkeley.edu' } });

      const res = await request(app)
        .put(`/api/admin/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ORGANIZER' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('ORGANIZER');

      // Revert back
      await request(app)
        .put(`/api/admin/users/${testUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'ATTENDEE' });
    });

    it('Audit Req 14: should prevent deleting category that has active events', async () => {
      // Find category that has events
      const categoryWithEvents = await prisma.category.findFirst({
        where: { events: { some: {} } },
      });

      const res = await request(app)
        .delete(`/api/admin/categories/${categoryWithEvents.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Cannot delete category');
    });

    it('Audit Req 11: should export structured CSV report for events with all required headers', async () => {
      const res = await request(app)
        .get('/api/admin/reports?type=EVENTS')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const firstRow = res.body.data[0];
      expect(firstRow).toHaveProperty('Title');
      expect(firstRow).toHaveProperty('Category');
      expect(firstRow).toHaveProperty('Capacity');
      expect(firstRow).toHaveProperty('Status');
    });

    it('Audit Req 11: should export structured CSV report for user accounts', async () => {
      const res = await request(app)
        .get('/api/admin/reports?type=USERS')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const firstRow = res.body.data[0];
      expect(firstRow).toHaveProperty('FullName');
      expect(firstRow).toHaveProperty('Email');
      expect(firstRow).toHaveProperty('Role');
    });
  });

  // =========================================================================
  // 8. SYSTEM HEALTH & RATE LIMITING
  // =========================================================================
  describe('System Health & Infrastructure', () => {
    it('Audit Req 15: should respond to /api/health with database connectivity status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBe('connected');
      expect(res.body.uptime).toBeGreaterThan(0);
    });

    it('Audit Req 15: should include rate-limit headers on authentication routes', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@eventhub.com', password: 'password123' });

      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
    });
  });
});
