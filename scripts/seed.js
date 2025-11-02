const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create or get organizer
  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@example.com' },
    update: {
      name: 'Organizer One',
      role: 'organizer',
    },
    create: {
      name: 'Organizer One',
      email: 'organizer@example.com',
      username: 'organizer1',
      role: 'organizer',
      skills: ['management'],
    },
  });

  // Create two participants
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: { name: 'Alice' },
    create: {
      name: 'Alice',
      email: 'alice@example.com',
      username: 'alice',
      skills: ['react', 'node'],
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: { name: 'Bob' },
    create: {
      name: 'Bob',
      email: 'bob@example.com',
      username: 'bob',
      skills: ['python'],
    },
  });

  // Create two organizer hackathons
  const hack1 = await prisma.organizerHackathon.upsert({
    where: { id: 'seed-hack-1' },
    update: {
      hackathonName: 'Hack for Good',
      description: 'Build projects that help communities.',
    },
    create: {
      id: 'seed-hack-1',
      hackathonName: 'Hack for Good',
      regURL: 'https://example.com/register/hack-for-good',
      hackathonMode: 'online',
      memberCount: '4',
      regDate: new Date('2026-01-15T00:00:00.000Z'),
      location: 'Remote',
      description: 'Build projects that help communities.',
      user: { connect: { id: organizer.id } },
    },
  });

  const hack2 = await prisma.organizerHackathon.upsert({
    where: { id: 'seed-hack-2' },
    update: {
      hackathonName: 'Campus Hackathon',
      description: 'On-campus 24 hour challenge.',
    },
    create: {
      id: 'seed-hack-2',
      hackathonName: 'Campus Hackathon',
      regURL: 'https://example.com/register/campus-hack',
      hackathonMode: 'offline',
      memberCount: '3',
      regDate: new Date('2026-03-03T00:00:00.000Z'),
      location: 'City University',
      description: 'On-campus 24 hour challenge.',
      user: { connect: { id: organizer.id } },
    },
  });

  // Add eligibility for hack1
  await prisma.eligibility.upsert({
    where: { organizerHackathonId: hack1.id },
    update: {
      criteria: { minExperienceYears: 0, requiredSkills: ['react'] },
    },
    create: {
      organizerHackathon: { connect: { id: hack1.id } },
      criteria: { minExperienceYears: 0, requiredSkills: ['react'] },
    },
  });

  // Create applications: Alice applied to hack1 (accepted), Bob applied to hack1 (pending)
  await prisma.application.upsert({
    where: { id: 'app-seed-1' },
    update: {
      status: 'ACCEPTED',
    },
    create: {
      id: 'app-seed-1',
      candidateId: alice.id,
      postId: hack1.id,
      status: 'ACCEPTED',
      linkedinUrl: 'https://linkedin.com/in/alice',
      githubUrl: 'https://github.com/alice',
      resumeUrl: '',
    },
  });

  await prisma.application.upsert({
    where: { id: 'app-seed-2' },
    update: {},
    create: {
      id: 'app-seed-2',
      candidateId: bob.id,
      postId: hack1.id,
      status: 'PENDING',
      linkedinUrl: 'https://linkedin.com/in/bob',
      githubUrl: 'https://github.com/bob',
      resumeUrl: '',
    },
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
