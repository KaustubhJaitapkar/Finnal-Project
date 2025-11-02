import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const organizerHackathon = await prisma.organizerHackathon.findUnique({ where: { id: params.id } });
  if (!organizerHackathon) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // counts by status
    const total = await prisma.application.count({ where: { postId: params.id } });
    const accepted = await prisma.application.count({ where: { postId: params.id, status: 'ACCEPTED' } });
    const rejected = await prisma.application.count({ where: { postId: params.id, status: 'REJECTED' } });
    const pending = total - accepted - rejected;

    // gather applicant skills
    const apps = await prisma.application.findMany({ where: { postId: params.id }, include: { user: true } });
    const skillCounts: Record<string, number> = {};
    let overlapSum = 0;
    let overlapCount = 0;

  const eligibility = await (prisma as any).eligibility.findUnique({ where: { organizerHackathonId: params.id } });
    const requiredSkills: string[] = (eligibility?.criteria?.requiredSkills as string[]) || [];

    for (const a of apps) {
      const uSkills = (a.user?.skills || []) as string[];
      for (const s of uSkills) {
        const normalized = s.trim().toLowerCase();
        if (!normalized) continue;
        skillCounts[normalized] = (skillCounts[normalized] || 0) + 1;
      }

      if (requiredSkills.length > 0) {
        const overlap = requiredSkills.filter(rs => uSkills.map(x=>x.toLowerCase()).includes(rs.toLowerCase())).length;
        overlapSum += overlap;
        overlapCount += 1;
      }
    }

    const topSkills = Object.entries(skillCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([skill,count])=>({ skill, count }));
    const averageOverlap = overlapCount > 0 ? overlapSum / overlapCount : null;

    return NextResponse.json({ total, accepted, rejected, pending, topSkills, averageOverlap }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
