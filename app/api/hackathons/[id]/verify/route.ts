import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

type VerifyRequest = {
  autoAccept?: boolean;
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const organizerHackathon = await prisma.organizerHackathon.findUnique({ where: { id: params.id } });
  if (!organizerHackathon) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json().catch(() => ({})) as VerifyRequest;
    const autoAccept = Boolean(body?.autoAccept);

  const eligibility = await (prisma as any).eligibility.findUnique({ where: { organizerHackathonId: params.id } });
  const criteria = (eligibility?.criteria as any) || {};

    // fetch applications for this hackathon
    const applications = await prisma.application.findMany({ where: { postId: params.id }, include: { user: true } });

    const results: any[] = [];

    for (const app of applications) {
      const reasons: string[] = [];
      let eligible = true;

      // criteria: { requiredSkills: string[], allowedEmailDomains: string[], minOverlap: number }
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

      results.push({ applicationId: app.id, applicantId: app.candidateId, eligible, reasons });

      if (eligible && autoAccept) {
        try {
          await prisma.application.update({ where: { id: app.id }, data: { status: 'ACCEPTED' } as any });
        } catch (e) {
          console.error('Failed to auto-accept', e);
        }
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
