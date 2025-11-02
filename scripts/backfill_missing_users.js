// scripts/backfill_missing_users.js
// Inserts minimal User rows for any missing user IDs referenced by Hackathon, OrganizerHackathon, or Application.
// Requires DATABASE_URL in env or .env. Run with: node scripts\backfill_missing_users.js

const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set in environment or .env');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Beginning backfill of missing User rows (inserting minimal users with empty skills array)');
    await client.query('BEGIN');

    const insertFromHackathon = `
      INSERT INTO "User" (id, "createdAt", "updatedAt", skills)
      SELECT DISTINCT h."userId", now(), now(), '{}'::text[]
      FROM "Hackathon" h
      WHERE h."userId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = h."userId")
    `;

    const res1 = await client.query(insertFromHackathon);
    console.log('Inserted users from Hackathon (rows):', res1.rowCount);

    const insertFromOrganizer = `
      INSERT INTO "User" (id, "createdAt", "updatedAt", skills)
      SELECT DISTINCT o."userId", now(), now(), '{}'::text[]
      FROM "OrganizerHackathon" o
      WHERE o."userId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = o."userId")
    `;

    const res2 = await client.query(insertFromOrganizer);
    console.log('Inserted users from OrganizerHackathon (rows):', res2.rowCount);

    const insertFromApplications = `
      INSERT INTO "User" (id, "createdAt", "updatedAt", skills)
      SELECT DISTINCT a."candidateId", now(), now(), '{}'::text[]
      FROM "Application" a
      WHERE a."candidateId" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = a."candidateId")
    `;

    const res3 = await client.query(insertFromApplications);
    console.log('Inserted users from Application (rows):', res3.rowCount);

    await client.query('COMMIT');
    console.log('Backfill completed successfully');
  } catch (err) {
    console.error('Error during backfill, rolling back:', err);
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback failed', e); }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
