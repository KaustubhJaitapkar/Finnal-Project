import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { auth } from "@/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const applications = await prisma.application.findMany({
      where: {
        candidateId: session.user.id,
      },
      include: {
        post: {
          select: {
            id: true,
            hackathonName: true,
            regURL: true,
            memberCount: true,
            regDate: true,
            location: true,
            description: true,
            userId: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            resumeUrl: true,
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
