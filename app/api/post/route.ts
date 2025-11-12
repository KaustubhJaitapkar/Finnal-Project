import { hackathonSchema } from './Types';
import { prisma } from '../../../lib/prisma';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';


export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await auth();
    // console.log("incoming",body,session);
    // const validationResult = hackathonSchema.safeParse(body);
    if(!session?.user.id){
       return NextResponse.json({ error: "Please login to post a hackathon" }, { status: 400 });
    }
    // if (!validationResult.success) {
    //   const errorMessages = validationResult.error.errors.map(err => ({
    //     field: err.path.join('.'),
    //     message: err.message,
    //   }));
    //   return NextResponse.json({ errors: errorMessages }, { status: 400 });
    // }

    const {
      teamName,
      hackathonName,
      regURL,
      hackathonMode,
      memberCount,
      regDate,
      location,
      description,
      skills,
      role,
      experience,
    } = body;

    // Basic validation
    if (!hackathonName || !regURL || !hackathonMode || !memberCount || !regDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Normalize skills to string[]
    const normalizedSkills = Array.isArray(skills)
      ? skills.map((s: any) => String(s))
      : typeof skills === 'string' && skills.length
      ? skills.split(',').map(s => s.trim())
      : [];

    const parsedDate = new Date(regDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid regDate' }, { status: 400 });
    }

    // Ensure the posting user exists (some auth flows may not have created a User row yet)
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {
        name: session.user.name || undefined,
      },
      create: {
        id: session.user.id,
        name: session.user.name || undefined,
        // `skills` is required in the schema so provide an empty array for new users
        skills: [],
      },
    });

    const organizerHackathon = await prisma.organizerHackathon.create({
      data: {
        // use undefined for omitted optional fields so Prisma doesn't try to set nulls explicitly
        teamName: teamName ?? undefined,
        hackathonName,
        regURL,
        hackathonMode,
        memberCount,
        regDate: parsedDate,
        location,
        description,
        // optional team-related fields
        skills: normalizedSkills,
        role: role ?? undefined,
        experience: experience ?? undefined,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ organizerHackathon }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
