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

    // If postId is not provided, fetch applications for all posts owned by the current organizer.
    // This makes the endpoint more forgiving for UI pages that render without a postId query param.
    let postFilter: any = undefined;
    if (postId) {
      // Validate ownership of the specific post
  const organizerPost = await (prisma as any).organizerHackathon.findUnique({ where: { id: postId } });
      if (organizerPost) {
        if (organizerPost.userId && organizerPost.userId !== session.user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      } else {
        // If it's not an OrganizerHackathon, reject (legacy Hackathon postings don't have applications in the new model)
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      postFilter = { postId };
    } else {
      // No postId: gather owned organizer hackathon ids and fetch applications for them
  const ownedPosts = (await (prisma as any).organizerHackathon.findMany({ where: { userId: session.user.id }, select: { id: true } })) as { id: string }[];
  const ids = ownedPosts.map((p) => p.id);
      if (ids.length === 0) {
        return NextResponse.json({ applications: [] }, { status: 200 });
      }
      postFilter = { postId: { in: ids } };
    }

    const applications = await prisma.application.findMany({
      where: postFilter,
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
 