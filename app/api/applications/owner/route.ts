import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const postId = url.searchParams.get("postId");

    if (!postId) {
      return NextResponse.json({ error: 'postId query parameter is required' }, { status: 400 });
    }

    // Ensure the requester is the owner of the post (supports both OrganizerHackathon and legacy Hackathon)
    const organizerPost = await prisma.organizerHackathon.findUnique({ where: { id: postId } });
    if (organizerPost) {
      // Allow if organizerPost is owned by the session user.
      // If organizerPost.userId is missing (rows created before migration),
      // allow access for now so organizers can still view applications —
      // we recommend backfilling userId on existing rows.
      if (organizerPost.userId && organizerPost.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      const legacy = await prisma.hackathon.findUnique({ where: { id: postId } });
      if (!legacy || legacy.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const applications = await prisma.application.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            resumeUrl: true,
            linkedinUrl: true,
            githubUrl: true,
            skills: true,
          },
        },
        post: {
          select: {
            id: true,
            hackathonName: true,
            regURL: true,
            memberCount: true,
            regDate: true,
            location: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ applications }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
