import { prisma } from '../../../../../lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const post = await prisma.organizerHackathon.findUnique({
      where: { id },
      include: { applications: true, eligibility: true },
    });

    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ post }, { status: 200 });
  } catch (err) {
    console.error('Debug fetch error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
