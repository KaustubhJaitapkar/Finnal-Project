import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "@/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await req.json();
    const status = body?.status as string;
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { post: true },
    });
    if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // only post owner can update
    if (application.post.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

  const parsedStatus = status === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED';
  const updated = await prisma.application.update({ where: { id }, data: { status: parsedStatus as any } });

    return NextResponse.json({ application: updated }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
