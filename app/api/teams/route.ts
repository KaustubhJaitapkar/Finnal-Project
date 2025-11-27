import { NextResponse } from 'next/server';

import { prisma } from '../../../lib/prisma';
import {auth} from '@/auth';
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    // Return organizer-posted team requests / posts so the Explore Teams page lists them.
    // const posts = await prisma.organizerHackathon.findMany({
    //   include: {
    //     user: {
    //       select: { id: true, name: true, email: true, resumeUrl: true, linkedinUrl: true, githubUrl: true, skills: true },
    //     },
    //   },
    //   orderBy: { createdAt: 'desc' },
    // });

     // If the user is authenticated, only return teams whose required skills match the user's skills.
    const session = await auth();
    const userId = session?.user?.id;

    // Default query (no filtering)
    const baseInclude = {
      user: {
        select: { id: true, name: true, email: true, resumeUrl: true, linkedinUrl: true, githubUrl: true, skills: true },
      },
    };

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { skills: true } });
      const userSkills = Array.isArray(user?.skills) ? user!.skills.filter(Boolean) : [];

      if (userSkills.length > 0) {
        const posts = await prisma.organizerHackathon.findMany({
          where: { skills: { hasSome: userSkills }, memberCount: { not: '0' } },
          include: baseInclude,
          orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ Hackathon: posts }, { status: 200 });
      }
    }

    // Fallback: return all posts if user not signed in or has no declared skills
  const posts = await prisma.organizerHackathon.findMany({ where: { memberCount: { not: '0' } }, include: baseInclude, orderBy: { createdAt: 'desc' } });


    return NextResponse.json({ Hackathon: posts }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
