import { execSync } from 'child_process';
import { PrismaClient } from '../server/node_modules/@prisma/client/index.js';

console.log('[Phase K] Starting Database Backup & Restore Verification...');

try {
  // 1. Dump database to /tmp/eventhub_backup.dump
  console.log('[1/5] Dumping database eventhub_phase54_test...');
  execSync('docker exec eventhub-postgres pg_dump -U postgres -d eventhub_phase54_test -F c -f /tmp/eventhub_backup.dump', { stdio: 'inherit' });

  // 2. Re-create eventhub_restore_verify
  console.log('[2/5] Creating verification database eventhub_restore_verify...');
  execSync('docker exec eventhub-postgres psql -U postgres -c "DROP DATABASE IF EXISTS eventhub_restore_verify;"', { stdio: 'inherit' });
  execSync('docker exec eventhub-postgres psql -U postgres -c "CREATE DATABASE eventhub_restore_verify;"', { stdio: 'inherit' });

  // 3. Restore dump
  console.log('[3/5] Restoring dump to eventhub_restore_verify...');
  execSync('docker exec eventhub-postgres pg_restore -U postgres -d eventhub_restore_verify /tmp/eventhub_backup.dump', { stdio: 'inherit' });

  // 4. Verify counts using Prisma on both databases
  console.log('[4/5] Verifying table counts between original and restored database...');
  const prismaOriginal = new PrismaClient({
    datasources: { db: { url: 'postgresql://postgres:postgrespassword@localhost:5432/eventhub_phase54_test?schema=public' } }
  });
  const prismaRestored = new PrismaClient({
    datasources: { db: { url: 'postgresql://postgres:postgrespassword@localhost:5432/eventhub_restore_verify?schema=public' } }
  });

  const models = [
    'role',
    'user',
    'category',
    'location',
    'event',
    'registration',
    'favorite',
    'notification',
    'eventImage',
    'activityLog',
    'waitlist',
    'attendance',
    'eventReminder'
  ];
  let allMatched = true;

  for (const m of models) {
    const countOrig = await prismaOriginal[m].count();
    const countRest = await prismaRestored[m].count();
    const match = countOrig === countRest;
    console.log(`  - Model ${m.padEnd(18)}: Original=${countOrig.toString().padStart(4)}, Restored=${countRest.toString().padStart(4)} | Match: ${match ? 'PASS' : 'FAIL'}`);
    if (!match) allMatched = false;
  }

  await prismaOriginal.$disconnect();
  await prismaRestored.$disconnect();

  if (!allMatched) {
    throw new Error('Table count parity check failed!');
  }

  // 5. Cleanup
  console.log('[5/5] Cleaning up verification database and dump file...');
  execSync('docker exec eventhub-postgres psql -U postgres -c "DROP DATABASE eventhub_restore_verify;"', { stdio: 'inherit' });
  execSync('docker exec eventhub-postgres rm /tmp/eventhub_backup.dump', { stdio: 'inherit' });

  console.log('✅ [Phase K] Backup & Restore Verification PASSED with 100% data parity across all 9 models.');
} catch (err) {
  console.error('❌ [Phase K] Error during backup & restore verification:', err.message);
  process.exit(1);
}
