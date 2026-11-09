import request from '../server/node_modules/supertest/index.js';
import app from '../server/src/app.js';
import { PrismaClient } from '../server/node_modules/@prisma/client/index.js';
import jwt from '../server/node_modules/jsonwebtoken/index.js';

const prisma = new PrismaClient();

async function runBenchmark() {
  console.log('[Phase J] Running Live Performance Benchmarking...');

  // 1. Healthcheck latency
  const healthTimes = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await request(app).get('/health');
    healthTimes.push(performance.now() - start);
  }
  const avgHealth = (healthTimes.reduce((a, b) => a + b, 0) / healthTimes.length).toFixed(2);
  const minHealth = Math.min(...healthTimes).toFixed(2);
  const maxHealth = Math.max(...healthTimes).toFixed(2);
  console.log(`- GET /health: avg=${avgHealth}ms (min=${minHealth}ms, max=${maxHealth}ms)`);

  // 2. Public Events Listing latency
  const eventsTimes = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await request(app).get('/api/events');
    eventsTimes.push(performance.now() - start);
  }
  const avgEvents = (eventsTimes.reduce((a, b) => a + b, 0) / eventsTimes.length).toFixed(2);
  const minEvents = Math.min(...eventsTimes).toFixed(2);
  const maxEvents = Math.max(...eventsTimes).toFixed(2);
  console.log(`- GET /api/events: avg=${avgEvents}ms (min=${minEvents}ms, max=${maxEvents}ms)`);

  // 3. Organizer Analytics latency (authenticated)
  const organizer = await prisma.user.findFirst({
    where: { role: { name: 'ORGANIZER' } }
  });
  if (organizer) {
    const token = jwt.sign(
      { userId: organizer.id, email: organizer.email, role: 'ORGANIZER' },
      process.env.JWT_SECRET || 'eventhub-super-secret-jwt-key-2026-production',
      { expiresIn: '1h' }
    );

    const analyticsTimes = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await request(app)
        .get('/api/organizer/analytics')
        .set('Authorization', `Bearer ${token}`);
      analyticsTimes.push(performance.now() - start);
    }
    const avgAnalytics = (analyticsTimes.reduce((a, b) => a + b, 0) / analyticsTimes.length).toFixed(2);
    const minAnalytics = Math.min(...analyticsTimes).toFixed(2);
    const maxAnalytics = Math.max(...analyticsTimes).toFixed(2);
    console.log(`- GET /api/organizer/analytics: avg=${avgAnalytics}ms (min=${minAnalytics}ms, max=${maxAnalytics}ms)`);
  }

  // 4. Raw Prisma Database query latency
  const dbTimes = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1 as ping`;
    dbTimes.push(performance.now() - start);
  }
  const avgDb = (dbTimes.reduce((a, b) => a + b, 0) / dbTimes.length).toFixed(2);
  console.log(`- Database Ping (SELECT 1): avg=${avgDb}ms`);

  const complexQueryTimes = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await prisma.event.findMany({
      take: 20,
      include: { category: true, location: true, organizer: { select: { fullName: true, email: true } } }
    });
    complexQueryTimes.push(performance.now() - start);
  }
  const avgComplex = (complexQueryTimes.reduce((a, b) => a + b, 0) / complexQueryTimes.length).toFixed(2);
  console.log(`- Complex Prisma Query (findMany 20 with 3 joins): avg=${avgComplex}ms`);

  await prisma.$disconnect();
}

runBenchmark().catch(console.error);
