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

  // If accepting, decrement the organizer-posted hackathon's memberCount
  if (parsedStatus === 'ACCEPTED') {
    // Use a transaction to update both application status and the post memberCount
    const result = await prisma.$transaction(async (tx) => {
      // re-fetch the organizer post inside the transaction to get latest memberCount
      const organizerPost = await tx.organizerHackathon.findUnique({ where: { id: application.postId } });
      if (!organizerPost) {
        throw new Error('Organizer post not found');
      }

      // memberCount is stored as a string in the schema; parse it safely
      const currentCount = parseInt(String(organizerPost.memberCount || '0'), 10) || 0;
      if (currentCount <= 0) {
        // no open slots left
        throw new Error('No open slots available for this team');
      }

      const newCount = String(Math.max(0, currentCount - 1));

      const updatedPost = await tx.organizerHackathon.update({ where: { id: organizerPost.id }, data: { memberCount: newCount } });

      const updatedApplication = await tx.application.update({ where: { id }, data: { status: parsedStatus as any } });

      return { updatedApplication, updatedPost };
    });

    return NextResponse.json({ application: result.updatedApplication, post: result.updatedPost }, { status: 200 });
  }

  const updated = await prisma.application.update({ where: { id }, data: { status: parsedStatus as any } });

    return NextResponse.json({ application: updated }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    // surface known errors with appropriate status codes
    if (error?.message?.includes('No open slots')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.message?.includes('Organizer post not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
