import { NextResponse } from 'next/server';

import { prisma } from '../../../lib/prisma';

export async function GET(req: Request) {
  try {
    // Return organizer-posted team requests / posts so the Explore Teams page lists them.
    const posts = await prisma.organizerHackathon.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, resumeUrl: true, linkedinUrl: true, githubUrl: true, skills: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ Hackathon: posts }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
