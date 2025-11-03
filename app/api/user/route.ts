import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: string | null;
  image: string | null;
  password: string;
  bio: string | null;
  role: string | null;
  createdAt: string;
  updatedAt: string;
  resumeUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  skills: any[];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const email = searchParams.get("email");
  const username = searchParams.get("username");

  try {
    if (!id && !email && !username) {
      return NextResponse.json(
        { message: "Please provide an id, email, or username." },
        { status: 400 },
      );
    }

    const conditions = [];
    if (id) conditions.push({ id: id as string });
    if (email) conditions.push({ email: email as string });
    if (username) conditions.push({ username: username as string });

    const user = await prisma.user.findFirst({
      where: {
        OR: conditions,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: user }, { status: 200 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    // Parse the request body. Accept both { user } and raw user object payloads.
    const body = await request.json().catch(() => ({}));
    const user = body?.user ?? body;
    console.log('Updating user with payload keys:', Object.keys(user || {}).join(','));

    // Validate
    if (!user || !user.id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 },
      );
    }

    // Remove undefined values
    Object.keys(user).forEach((key) => {
      if (user[key] === undefined) {
        delete user[key];
      }
    });

    // If no other details are provided, return an error
    if (Object.keys(user).length === 0) {
      return NextResponse.json(
        { error: 'No user details provided for update' },
        { status: 400 },
      );
    }

    // Normalize skills to array when provided as comma-separated string
    let skillsToSet: any[] | undefined = undefined;
    if (typeof user.skills === 'string') {
      skillsToSet = user.skills
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s);
    } else if (Array.isArray(user.skills)) {
      skillsToSet = user.skills;
    }

    // Build a sanitized `data` object that only includes scalar fields
    // defined on the User model. This prevents sending relation arrays
    // (e.g. applications, hackathons) which Prisma expects nested inputs for.
    const allowedFields = [
      'name',
      'username',
      'email',
      'emailVerified',
      'image',
      'password',
      'bio',
      'role',
      'resumeUrl',
      'linkedinUrl',
      'githubUrl',
    ];

    const data: any = {};
    allowedFields.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(user, key)) {
        // Convert emailVerified ISO string to a Date object if necessary
        if (key === 'emailVerified' && typeof user[key] === 'string') {
          const d = new Date(user[key]);
          if (!isNaN(d.getTime())) data.emailVerified = d;
        } else {
          data[key] = user[key];
        }
      }
    });

    if (skillsToSet) {
      data.skills = { set: skillsToSet };
    }

    // Update the user in the database with only allowed scalars
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    // Return the updated user details
    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
