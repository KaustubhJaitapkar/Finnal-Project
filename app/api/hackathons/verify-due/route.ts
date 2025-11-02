import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  // find organizer-posted hackathons whose regDate is due
  const hackathons = await prisma.organizerHackathon.findMany({ where: { regDate: { lte: now } } });

    const allResults: any[] = [];

    for (const h of hackathons) {
  const eligibility = await (prisma as any).eligibility.findUnique({ where: { organizerHackathonId: h.id } });
      const criteria = (eligibility?.criteria as any) || {};

      const applications = await prisma.application.findMany({ where: { postId: h.id }, include: { user: true } });

      for (const app of applications) {
        const reasons: string[] = [];
        let eligible = true;

        const requiredSkills: string[] = (criteria?.requiredSkills as string[]) || [];
        const allowedEmailDomains: string[] = (criteria?.allowedEmailDomains as string[]) || [];
        const minOverlap: number = typeof (criteria?.minOverlap as any) === 'number' ? (criteria.minOverlap as number) : (requiredSkills.length > 0 ? requiredSkills.length : 1);

        const userSkills = (app.user.skills || []) as string[];
        const overlap = requiredSkills.filter((s: string) => userSkills.map(u=>u.toLowerCase()).includes(s.toLowerCase())).length;
        if (requiredSkills.length > 0 && overlap < minOverlap) {
          eligible = false;
          reasons.push(`Insufficient skill overlap (${overlap}/${requiredSkills.length})`);
        }

        if (allowedEmailDomains.length > 0 && app.user.email) {
          const domain = app.user.email.split('@').pop() || '';
          if (!allowedEmailDomains.map(d=>d.toLowerCase()).includes(domain.toLowerCase())) {
            eligible = false;
            reasons.push(`Email domain ${domain} not allowed`);
          }
        }

        allResults.push({ hackathonId: h.id, applicationId: app.id, applicantId: app.candidateId, eligible, reasons });
      }
    }

    return NextResponse.json({ processedCount: hackathons.length, results: allResults }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
