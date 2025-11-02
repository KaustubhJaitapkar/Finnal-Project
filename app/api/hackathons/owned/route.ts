import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    // Public endpoint: return all organizer-posted hackathons (ordered by newest)
    const hackathons = await prisma.organizerHackathon.findMany({ orderBy: { createdAt: 'desc' } });

  return NextResponse.json({ hackathons }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
