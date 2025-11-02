import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizerHackathon = await prisma.organizerHackathon.findUnique({ where: { id: params.id } });
    if (!organizerHackathon) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // owner checks removed: return eligibility for the organizer-posted hackathon
  const eligibility = await (prisma as any).eligibility.findUnique({ where: { organizerHackathonId: params.id } });
    return NextResponse.json({ criteria: eligibility?.criteria || null }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const organizerHackathon = await prisma.organizerHackathon.findUnique({ where: { id: params.id } });
  if (!organizerHackathon) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const body = await req.json();
    const criteria = body?.criteria;
    if (!criteria) return NextResponse.json({ error: 'Missing criteria' }, { status: 400 });

    // upsert
    const existing = await (prisma as any).eligibility.findUnique({ where: { organizerHackathonId: params.id } });
    let saved;
    if (existing) {
      saved = await (prisma as any).eligibility.update({ where: { organizerHackathonId: params.id }, data: { criteria } });
    } else {
      saved = await (prisma as any).eligibility.create({ data: { organizerHackathonId: params.id, criteria } });
    }

    return NextResponse.json({ criteria: saved.criteria }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
