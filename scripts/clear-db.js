// Danger: destructive. Deletes all rows from the database tables used by the app.
// Usage: node scripts/clear-db.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting DB clear — deleting rows from tables in dependency-safe order...');

  const deleted = {};

  // Delete dependent child tables first
  async function tryDelete(modelName, fn) {
    try {
      console.log(`Deleting ${modelName} rows...`);
      const res = await fn();
      deleted[modelName] = res.count ?? res;
    } catch (err) {
      // If the table doesn't exist or other known prisma error, skip and continue
      console.warn(`Skipping ${modelName}:`, err?.message || err);
      deleted[modelName] = 'skipped';
    }
  }

  await tryDelete('applications', () => prisma.application.deleteMany());
  await tryDelete('eligibility', () => prisma.eligibility.deleteMany());
  await tryDelete('externalHackathonFavorite', () => prisma.externalHackathonFavorite.deleteMany());
  await tryDelete('hackathons', () => prisma.hackathon.deleteMany());
  await tryDelete('accounts', () => prisma.account.deleteMany());
  await tryDelete('passwordResetToken', () => prisma.passwordResetToken.deleteMany());
  await tryDelete('verificationToken', () => prisma.verificationToken.deleteMany());
  await tryDelete('users', () => prisma.user.deleteMany());

  console.log('\nDone. Summary:');
  console.table(deleted);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Failed to clear DB:', e);
  prisma.$disconnect();
  process.exit(1);
});
