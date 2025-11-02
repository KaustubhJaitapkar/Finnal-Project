// scripts/copy_hackathons_to_organizer.js
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
    console.log('Beginning copy of Hackathon -> OrganizerHackathon (for referenced postIds)');
    await client.query('BEGIN');

    const insertSql = `
      INSERT INTO "OrganizerHackathon" (id, "hackathonName", "regURL", "hackathonMode", "memberCount", "regDate", "location", "description", "createdAt", "updatedAt")
      SELECT h.id, h."hackathonName", h."regURL", h."hackathonMode", h."memberCount", h."regDate", h."location", h."description", h."createdAt", h."updatedAt"
      FROM "Hackathon" h
      WHERE EXISTS (SELECT 1 FROM "Application" a WHERE a."postId" = h.id)
      AND NOT EXISTS (SELECT 1 FROM "OrganizerHackathon" o WHERE o.id = h.id)
    `;

    const res = await client.query(insertSql);
    console.log('Inserted rows count (may be 0 if none needed):', res.rowCount);
    await client.query('COMMIT');
    console.log('Copy completed successfully');
  } catch (err) {
    console.error('Error during copy, rolling back:', err);
    try { await client.query('ROLLBACK'); } catch (e) { console.error('Rollback failed', e); }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
