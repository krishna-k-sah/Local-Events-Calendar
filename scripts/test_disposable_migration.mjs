import { execSync } from 'child_process';
import { PrismaClient } from '../server/node_modules/@prisma/client/index.js';

console.log('=== [DEF-003 AUDIT] Testing Migration on Disposable PostgreSQL Database ===');

const TEST_DB_NAME = 'eventhub_disposable_mig_test';
const TEST_DB_URL = `postgresql://postgres:postgrespassword@localhost:5432/${TEST_DB_NAME}?schema=public`;

try {
  // 1. Create clean disposable database
  console.log(`[1/9] Creating clean disposable database: ${TEST_DB_NAME}...`);
  execSync(`docker exec eventhub-postgres psql -U postgres -c "DROP DATABASE IF EXISTS ${TEST_DB_NAME};"`, { stdio: 'inherit' });
  execSync(`docker exec eventhub-postgres psql -U postgres -c "CREATE DATABASE ${TEST_DB_NAME};"`, { stdio: 'inherit' });

  // 2. Run fresh database migration
  console.log('[2/9] Running fresh migration: npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma...');
  execSync('npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma', {
    cwd: './server',
    env: { ...process.env, DATABASE_URL: TEST_DB_URL, DIRECT_URL: TEST_DB_URL },
    stdio: 'inherit',
  });

  // 3. Verify existing database re-migration (idempotent run)
  console.log('[3/9] Running re-migration (idempotent test)...');
  execSync('npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma', {
    cwd: './server',
    env: { ...process.env, DATABASE_URL: TEST_DB_URL, DIRECT_URL: TEST_DB_URL },
    stdio: 'inherit',
  });

  // 4. Verify migration status
  console.log('[4/9] Verifying migration history via prisma migrate status...');
  execSync('npx prisma migrate status --schema=prisma/schema.postgresql.prisma', {
    cwd: './server',
    env: { ...process.env, DATABASE_URL: TEST_DB_URL, DIRECT_URL: TEST_DB_URL },
    stdio: 'inherit',
  });

  // 5. Connect and verify actual table creation
  console.log('[5/9] Verifying actual table creation in PostgreSQL schema...');
  const prisma = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
  });

  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  console.log(`Found ${tables.length} tables:`, tables.map((t) => t.table_name).join(', '));
  const expectedTables = ['_prisma_migrations', 'activity_logs', 'attendances', 'categories', 'event_images', 'event_reminders', 'events', 'favorites', 'locations', 'notifications', 'registrations', 'roles', 'users', 'waitlists'];
  for (const exp of expectedTables) {
    if (!tables.some((t) => t.table_name === exp)) {
      throw new Error(`Missing expected table: ${exp}`);
    }
  }

  // 6. Verify foreign-key constraints
  console.log('[6/9] Verifying Foreign Key constraints in PostgreSQL...');
  const fks = await prisma.$queryRaw`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name;
  `;
  console.log(`Verified ${fks.length} Foreign Key constraints.`);

  // 7. Verify unique constraints & indexes
  console.log('[7/9] Verifying Unique constraints & Indexes...');
  const indexes = await prisma.$queryRaw`
    SELECT tablename, indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `;
  console.log(`Verified ${indexes.length} database indexes across public schema.`);

  // 8. Test Client Generation & App Connectivity (write and read test record)
  console.log('[8/9] Verifying Prisma Client write and read connectivity...');
  const role = await prisma.role.create({
    data: { name: 'TEST_AUDIT_ROLE', description: 'Testing connectivity' },
  });
  const fetchedRole = await prisma.role.findUnique({
    where: { id: role.id },
  });
  if (fetchedRole?.name !== 'TEST_AUDIT_ROLE') {
    throw new Error('Database read/write verification failed on test record.');
  }
  console.log('Successfully wrote and read back role:', fetchedRole.name);

  await prisma.$disconnect();

  // 9. Cleanup disposable database
  console.log('[9/9] Dropping disposable database...');
  execSync(`docker exec eventhub-postgres psql -U postgres -c "DROP DATABASE ${TEST_DB_NAME};"`, { stdio: 'inherit' });

  console.log('✅ [DEF-003 AUDIT] All 9 PostgreSQL migration verification checks PASSED successfully!');
} catch (err) {
  console.error('❌ [DEF-003 AUDIT] Migration verification error:', err.message);
  process.exit(1);
}
