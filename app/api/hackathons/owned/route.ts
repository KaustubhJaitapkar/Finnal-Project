import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    // Public endpoint: return all organizer-posted hackathons (ordered by newest)
    // Hide posts where memberCount is 0 (no open slots)
    const hackathons = await prisma.organizerHackathon.findMany({ where: { memberCount: { not: '0' } }, orderBy: { createdAt: 'desc' } });

  return NextResponse.json({ hackathons }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
