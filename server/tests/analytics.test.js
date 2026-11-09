import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/db.js';

describe('Phase 5.3 – Analytics Mathematical Accuracy & Synthetic Dataset Validation', () => {
  let organizerToken;
  let organizerUser;
  let syntheticEventA;
  let syntheticEventZero;

  beforeAll(async () => {
    // 1. Create dedicated organizer
    const time = Date.now();
    const roleOrg = await prisma.role.findFirst({ where: { name: 'ORGANIZER' } });
    const roleAtt = await prisma.role.findFirst({ where: { name: 'ATTENDEE' } });
    const cat = await prisma.category.findFirst();
    const loc = await prisma.location.findFirst();

    organizerUser = await prisma.user.create({
      data: {
        email: `analytics_org_${time}@test.com`,
        passwordHash: 'hashed_pw',
        fullName: 'Analytics Test Organizer',
        roleId: roleOrg.id,
      },
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: organizerUser.email,
      password: 'password123', // Or generate token directly
    });
    // If password login fails due to dummy hash, sign token or use seed organizer
    if (loginRes.status === 200) {
      organizerToken = loginRes.body.token;
    } else {
      const seedOrg = await request(app).post('/api/auth/login').send({
        email: 'elena@novatech.io',
        password: 'password123',
      });
      organizerToken = seedOrg.body.token;
      organizerUser = seedOrg.body.user;
    }

    // 2. Synthetic Event A: Known controlled metrics
    // maxCapacity: 100, 80 confirmed, 20 attended, 10 cancelled
    syntheticEventA = await prisma.event.create({
      data: {
        title: `Synthetic Event A ${time}`,
        description: 'Controlled dataset for formula verification',
        maxCapacity: 100,
        currentRegistered: 80,
        startDate: new Date(Date.now() + 30 * 86400 * 1000), // 30 days in future to isolate from 24h reminder window
        organizerId: organizerUser.id,
        categoryId: cat.id,
        locationId: loc.id,
        status: 'PUBLISHED',
      },
    });

    // Create 80 confirmed attendees (20 of which are attended)
    for (let i = 0; i < 80; i++) {
      const att = await prisma.user.create({
        data: {
          email: `syn_att_${time}_${i}@test.com`,
          passwordHash: 'pw',
          fullName: `Attendee ${i}`,
          roleId: roleAtt.id,
        },
      });

      const isAttended = i < 20; // First 20 attended
      const reg = await prisma.registration.create({
        data: {
          eventId: syntheticEventA.id,
          userId: att.id,
          ticketCode: `EVT-SYN-${time.toString().slice(-4)}-${i}`,
          status: isAttended ? 'ATTENDED' : 'CONFIRMED',
        },
      });

      if (isAttended) {
        await prisma.attendance.create({
          data: {
            eventId: syntheticEventA.id,
            registrationId: reg.id,
            userId: att.id,
            ticketCode: reg.ticketCode,
            scannedById: organizerUser.id,
            method: 'QR',
          },
        });
      }
    }

    // Create 10 cancelled registrations
    for (let i = 80; i < 90; i++) {
      const att = await prisma.user.create({
        data: {
          email: `syn_can_${time}_${i}@test.com`,
          passwordHash: 'pw',
          fullName: `Cancelled Attendee ${i}`,
          roleId: roleAtt.id,
        },
      });

      await prisma.registration.create({
        data: {
          eventId: syntheticEventA.id,
          userId: att.id,
          ticketCode: `EVT-SYN-CAN-${time.toString().slice(-4)}-${i}`,
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
    }

    // Create Waitlist for Event A: 4 eligible (2 ACCEPTED/promoted, 2 PENDING)
    for (let i = 0; i < 4; i++) {
      const waitUser = await prisma.user.create({
        data: {
          email: `syn_wait_${time}_${i}@test.com`,
          passwordHash: 'pw',
          fullName: `Waitlister ${i}`,
          roleId: roleAtt.id,
        },
      });

      await prisma.waitlist.create({
        data: {
          eventId: syntheticEventA.id,
          userId: waitUser.id,
          status: i < 2 ? 'ACCEPTED' : 'PENDING',
          position: i + 1,
        },
      });
    }

    // 3. Synthetic Event Zero: Edge case with zero capacity and zero records
    syntheticEventZero = await prisma.event.create({
      data: {
        title: `Synthetic Zero Event ${time}`,
        description: 'Zero denominator test',
        maxCapacity: 0,
        currentRegistered: 0,
        startDate: new Date(Date.now() + 30 * 86400 * 1000), // 30 days in future to isolate from 24h reminder window
        organizerId: organizerUser.id,
        categoryId: cat.id,
        locationId: loc.id,
        status: 'PUBLISHED',
      },
    });
  });

  it('1. should calculate exact Capacity Utilization (80/100 = 80%) for Event A', async () => {
    const res = await request(app)
      .get('/api/organizer/analytics')
      .set('Authorization', `Bearer ${organizerToken}`);

    expect(res.status).toBe(200);
    const eventPerf = res.body.data.eventPerformance.find((e) => e.id === syntheticEventA.id);
    expect(eventPerf).toBeDefined();

    // Capacity Utilization = (80 / 100) * 100 = 80%
    expect(eventPerf.capacityUtilization).toBe(80);
    expect(eventPerf.registeredCount).toBe(80);
    expect(eventPerf.maxCapacity).toBe(100);
  });

  it('2. should calculate exact Attendance Rate (20 unique check-ins / 80 confirmed = 25%)', async () => {
    const res = await request(app)
      .get('/api/organizer/analytics')
      .set('Authorization', `Bearer ${organizerToken}`);

    const eventPerf = res.body.data.eventPerformance.find((e) => e.id === syntheticEventA.id);
    // Attendance Rate = (20 / 80) * 100 = 25%
    expect(eventPerf.attendedCount).toBe(20);
    expect(eventPerf.attendanceRate).toBe(25);
  });

  it('3. should calculate exact Cancellation Rate (10 cancelled / (80 confirmed + 10 cancelled) = 11%)', async () => {
    const res = await request(app)
      .get('/api/organizer/analytics')
      .set('Authorization', `Bearer ${organizerToken}`);

    const eventPerf = res.body.data.eventPerformance.find((e) => e.id === syntheticEventA.id);
    // Cancellation Rate = Math.round((10 / 90) * 100) = Math.round(11.11) = 11%
    expect(eventPerf.cancelledCount).toBe(10);
    expect(eventPerf.cancellationRate).toBe(11);
  });

  it('4. should calculate exact Waitlist Promotion Rate (2 promoted / 4 eligible = 50%)', async () => {
    const res = await request(app)
      .get('/api/organizer/analytics')
      .set('Authorization', `Bearer ${organizerToken}`);

    const eventPerf = res.body.data.eventPerformance.find((e) => e.id === syntheticEventA.id);
    // Waitlist Promotion Rate = (2 / 4) * 100 = 50%
    expect(eventPerf.waitlistPromotionRate).toBe(50);
    expect(eventPerf.waitlistConversionRate).toBe(50);
  });

  it('5. should safely return 0 and prevent NaN/Infinity for Event Zero (zero denominators)', async () => {
    const res = await request(app)
      .get('/api/organizer/analytics')
      .set('Authorization', `Bearer ${organizerToken}`);

    const zeroPerf = res.body.data.eventPerformance.find((e) => e.id === syntheticEventZero.id);
    expect(zeroPerf).toBeDefined();

    expect(zeroPerf.capacityUtilization).toBe(0);
    expect(zeroPerf.attendanceRate).toBe(0);
    expect(zeroPerf.cancellationRate).toBe(0);
    expect(zeroPerf.waitlistPromotionRate).toBe(0);

    expect(isNaN(zeroPerf.capacityUtilization)).toBe(false);
    expect(isNaN(zeroPerf.attendanceRate)).toBe(false);
    expect(isNaN(zeroPerf.cancellationRate)).toBe(false);
    expect(isNaN(zeroPerf.waitlistPromotionRate)).toBe(false);
  });

  it('6. should explicitly flag registrationConversionRate as unavailable with descriptive reason', async () => {
    const res = await request(app)
      .get('/api/organizer/analytics')
      .set('Authorization', `Bearer ${organizerToken}`);

    const summary = res.body.data.summary;
    expect(summary.registrationConversionRate.available).toBe(false);
    expect(summary.registrationConversionRate.value).toBeNull();
    expect(summary.registrationConversionRate.reason).toContain('visitor tracking');
  });
});

