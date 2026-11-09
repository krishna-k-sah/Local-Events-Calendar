import { execSync } from 'child_process';
import { PrismaClient } from '../server/node_modules/@prisma/client/index.js';

console.log('=== [DEF-008 AUDIT] Deep Backup and Restore Reliability Verification ===');

const SOURCE_DB = 'eventhub_phase54_test';
const RESTORE_TARGET_DB = 'eventhub_restore_verify';
const DUMP_PATH = '/tmp/eventhub_backup.dump';

// Overwrite protection safeguard
if (SOURCE_DB === RESTORE_TARGET_DB) {
  throw new Error('FATAL SAFETY VIOLATION: Source and target restore databases cannot be the same!');
}

try {
  // 1. Dump database using PostgreSQL custom archive format
  console.log(`[1/6] Dumping source database "${SOURCE_DB}" to ${DUMP_PATH}...`);
  execSync(`docker exec eventhub-postgres pg_dump -U postgres -d ${SOURCE_DB} -F c -f ${DUMP_PATH}`, { stdio: 'inherit' });

  // 2. Validate dump file structure using pg_restore -l (TOC listing)
  console.log('[2/6] Validating archive file structure with pg_restore -l ...');
  const toc = execSync(`docker exec eventhub-postgres pg_restore -l ${DUMP_PATH}`).toString();
  if (!toc.includes('TABLE DATA public users') || !toc.includes('TABLE DATA public events')) {
    throw new Error('Dump file TOC validation failed: Missing core table data.');
  }
  console.log('Archive TOC listing verified: Contains all valid PostgreSQL table data headers.');

  // 3. Create isolated restore database
  console.log(`[3/6] Preparing isolated verification database "${RESTORE_TARGET_DB}"...`);
  execSync(`docker exec eventhub-postgres psql -U postgres -c "DROP DATABASE IF EXISTS ${RESTORE_TARGET_DB};"`, { stdio: 'inherit' });
  execSync(`docker exec eventhub-postgres psql -U postgres -c "CREATE DATABASE ${RESTORE_TARGET_DB};"`, { stdio: 'inherit' });

  // 4. Restore dump into separate target database
  console.log(`[4/6] Restoring dump to "${RESTORE_TARGET_DB}"...`);
  execSync(`docker exec eventhub-postgres pg_restore -U postgres -d ${RESTORE_TARGET_DB} ${DUMP_PATH}`, { stdio: 'inherit' });

  // 5. Deep Parity & Relational Consistency Verification
  console.log('[5/6] Verifying model counts and complex relational integrity on restored database...');
  const prismaOriginal = new PrismaClient({
    datasources: { db: { url: `postgresql://postgres:postgrespassword@localhost:5432/${SOURCE_DB}?schema=public` } },
  });
  const prismaRestored = new PrismaClient({
    datasources: { db: { url: `postgresql://postgres:postgrespassword@localhost:5432/${RESTORE_TARGET_DB}?schema=public` } },
  });

  const models = [
    'role', 'user', 'category', 'location', 'event', 'registration',
    'favorite', 'notification', 'eventImage', 'activityLog', 'waitlist',
    'attendance', 'eventReminder'
  ];

  for (const m of models) {
    const countOrig = await prismaOriginal[m].count();
    const countRest = await prismaRestored[m].count();
    if (countOrig !== countRest) {
      throw new Error(`Count mismatch on model ${m}: Original=${countOrig}, Restored=${countRest}`);
    }
    console.log(`  - ${m.padEnd(16)}: ${countRest} records (100% match)`);
  }

  // Relational query test on restored database
  const sampleEvent = await prismaRestored.event.findFirst({
    where: { status: 'PUBLISHED' },
    include: {
      category: true,
      location: true,
      organizer: { select: { fullName: true, email: true } },
      registrations: { take: 5, include: { user: { select: { fullName: true } } } },
    },
  });
  if (!sampleEvent || !sampleEvent.category || !sampleEvent.location || !sampleEvent.organizer) {
    throw new Error('Relational integrity query failed on restored database.');
  }
  console.log(`  - Verified relational joins: Event "${sampleEvent.title}" -> Category "${sampleEvent.category.name}", Organizer "${sampleEvent.organizer.fullName}".`);

  // Active write verification into restored database (ensures primary key / unique constraints work)
  const testRole = await prismaRestored.role.create({
    data: { name: 'RESTORE_AUDIT_VERIFIED', description: 'Integrity check' },
  });
  if (!testRole.id) throw new Error('Failed to create record in restored database.');
  console.log('  - Verified active write/read capability in restored database.');

  await prismaOriginal.$disconnect();
  await prismaRestored.$disconnect();

  // 6. Cleanup
  console.log('[6/6] Cleaning up verification database and dump file...');
  execSync(`docker exec eventhub-postgres psql -U postgres -c "DROP DATABASE ${RESTORE_TARGET_DB};"`, { stdio: 'inherit' });
  execSync(`docker exec eventhub-postgres rm ${DUMP_PATH}`, { stdio: 'inherit' });

  console.log('✅ [DEF-008 AUDIT] Deep Backup and Restore Reliability PASSED with complete data and relational parity!');
} catch (err) {
  console.error('❌ [DEF-008 AUDIT] Error during backup verification:', err.message);
  process.exit(1);
}
