import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

describe('Phase 4.1 End-to-End Persona Workflows Across All 20 Views', () => {
  let adminToken;
  let organizerToken;
  let attendeeToken;
  let dynamicEventId;
  let dynamicCategoryId;

  beforeAll(async () => {
    // Clean and setup
    const cat = await prisma.category.findFirst();
    dynamicCategoryId = cat.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // WORKFLOW A: ADMINISTRATOR
  // =========================================================================
  describe('Administrator Persona Workflows', () => {
    it('View 1: Admin Login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@eventhub.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role.name).toBe('ADMIN');
      adminToken = res.body.token;
    });

    it('View 2: Admin Dashboard Telemetry', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalEvents).toBeGreaterThan(0);
      expect(res.body.data.totalUsers).toBeGreaterThan(0);
      expect(res.body.data.monthlyTrends).toBeDefined();
      expect(res.body.data.categoryDistribution).toBeDefined();
    });

    it('View 3: Admin User Governance & Role Management', async () => {
      const usersRes = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(usersRes.status).toBe(200);
      expect(Array.isArray(usersRes.body.data)).toBe(true);

      const targetUser = usersRes.body.data.find((u) => u.role === 'ATTENDEE');
      if (targetUser) {
        const updateRes = await request(app)
          .put(`/api/admin/users/${targetUser.id}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'ATTENDEE' });
        expect(updateRes.status).toBe(200);
      }
    });

    it('View 4: Admin Event Moderation & Approvals', async () => {
      const pendingRes = await request(app)
        .get('/api/admin/events/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pendingRes.status).toBe(200);
      expect(Array.isArray(pendingRes.body.data)).toBe(true);
    });

    it('View 5: Admin Taxonomy & Category Management', async () => {
      const testSlug = `e2e-cat-${Date.now()}`;
      const createRes = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `E2E Category ${Date.now()}`,
          slug: testSlug,
          color: '#ec4899',
          icon: 'Tag',
        });

      expect(createRes.status).toBe(201);
      const catId = createRes.body.data.id;

      // Update
      const updateRes = await request(app)
        .put(`/api/admin/categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'E2E Category Updated' });
      expect(updateRes.status).toBe(200);

      // Clean delete
      const delRes = await request(app)
        .delete(`/api/admin/categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);
    });

    it('View 6: Admin Reports & Data Audit Ledgers', async () => {
      const eventsReport = await request(app)
        .get('/api/admin/reports?type=EVENTS')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(eventsReport.status).toBe(200);
      expect(Array.isArray(eventsReport.body.data)).toBe(true);

      const regReport = await request(app)
        .get('/api/admin/reports?type=REGISTRATIONS')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(regReport.status).toBe(200);
      expect(Array.isArray(regReport.body.data)).toBe(true);
    });
  });

  // =========================================================================
  // WORKFLOW B: EVENT ORGANIZER
  // =========================================================================
  describe('Event Organizer Persona Workflows', () => {
    it('View 7: Organizer Login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'elena@novatech.io', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user.role.name).toBe('ORGANIZER');
      organizerToken = res.body.token;
    });

    it('View 8: Organizer My Events Roster', async () => {
      const res = await request(app)
        .get('/api/events/organizer/my')
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('View 9: Organizer Event Creation Wizard', async () => {
      const res = await request(app)
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'E2E Organizer Summit 2027',
          description: 'A live end-to-end verification conference for production readiness.',
          categoryId: dynamicCategoryId,
          startDate: '2027-11-20T09:00:00Z',
          endDate: '2027-11-20T17:00:00Z',
          venueName: 'Palace of Fine Arts',
          address: '3301 Lyon St',
          city: 'San Francisco',
          maxCapacity: 150,
          isFree: false,
          price: 25.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      dynamicEventId = res.body.data.id;
    });

    it('View 10: Organizer Event Editor', async () => {
      const res = await request(app)
        .put(`/api/events/${dynamicEventId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'E2E Organizer Summit 2027 (Updated Title)',
          price: 30.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toContain('Updated Title');
    });

    it('View 11: Organizer Attendees Roster', async () => {
      const res = await request(app)
        .get(`/api/events/${dynamicEventId}/attendees`)
        .set('Authorization', `Bearer ${organizerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // =========================================================================
  // WORKFLOW C: ATTENDEE & PUBLIC DISCOVERY
  // =========================================================================
  describe('Attendee & Public Discovery Persona Workflows', () => {
    let attendeeEmail;

    it('View 12: Public Landing Page & Featured Events', async () => {
      const featured = await request(app).get('/api/events/featured');
      expect(featured.status).toBe(200);
      expect(Array.isArray(featured.body.data)).toBe(true);
    });

    it('View 13: Public Event Discovery with Query & Multi-Filters', async () => {
      const res = await request(app).get('/api/events?city=San%20Francisco&price=FREE');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('View 14: Interactive Community Calendar Feed', async () => {
      const res = await request(app).get('/api/events/calendar');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty('title');
        expect(res.body.data[0]).toHaveProperty('start');
      }
    });

    it('View 15: Attendee Registration', async () => {
      attendeeEmail = `e2e_attendee_${Date.now()}@testcommunity.org`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Jordan Miller',
          email: attendeeEmail,
          password: 'password123',
          role: 'ATTENDEE',
          city: 'San Francisco',
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      attendeeToken = res.body.token;
    });

    it('View 16: Event Details View & RSVP Registration', async () => {
      // First publish the event so attendee can register
      await prisma.event.update({
        where: { id: dynamicEventId },
        data: { status: 'PUBLISHED' },
      });

      // View details
      const detailRes = await request(app).get(`/api/events/${dynamicEventId}`);
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.title).toBeDefined();

      // Register / RSVP
      const regRes = await request(app)
        .post(`/api/events/${dynamicEventId}/register`)
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(regRes.status).toBe(201);
      expect(regRes.body.data.ticketCode).toMatch(/^EVT-/);
    });

    it('View 17: Attendee My Registrations & Passes', async () => {
      const res = await request(app)
        .get('/api/users/registrations')
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].eventId).toBe(dynamicEventId);
    });

    it('View 18: Favorites & Bookmarks Ledger', async () => {
      // Toggle favorite on
      const favRes = await request(app)
        .post(`/api/events/${dynamicEventId}/favorite`)
        .set('Authorization', `Bearer ${attendeeToken}`);
      expect(favRes.status).toBe(200);
      expect(favRes.body.isFavorited).toBe(true);

      // Fetch favorites
      const listRes = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${attendeeToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.data.favoriteIds).toContain(dynamicEventId);
    });

    it('View 19: In-App Notification Center', async () => {
      const notifsRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${attendeeToken}`);

      expect(notifsRes.status).toBe(200);
      expect(notifsRes.body.data.length).toBeGreaterThan(0);

      // Read all notifications
      const readRes = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${attendeeToken}`);
      expect(readRes.status).toBe(200);
    });

    it('View 20: User Profile & Account Settings Management', async () => {
      // Fetch profile
      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${attendeeToken}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe(attendeeEmail);

      // Update profile
      const updateRes = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${attendeeToken}`)
        .send({
          fullName: 'Jordan Miller (Verified)',
          phone: '+1 555-0199',
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.user.fullName).toBe('Jordan Miller (Verified)');
    });
  });
});
