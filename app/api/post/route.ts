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

    // Accept multiple possible shapes from different clients; fall back to sensible defaults
    const teamName = body.teamName ?? body.team_name ?? body.team;
    const hackathonName = body.hackathonName ?? body.hackathon_name ?? body.title ?? body.hackathonName ?? undefined;
    const regURL = body.regURL ?? body.regUrl ?? body.website ?? body.websiteUrl ?? body.website ?? undefined;
    const hackathonMode = body.hackathonMode ?? body.hackathon_mode ?? body.opportunityType ?? 'Online';
    const memberCount = body.memberCount ?? body.member_count ?? String(body.memberCount ?? '0');
    const regDate = body.regDate ?? body.reg_date ?? body.startDate ?? new Date().toISOString();
    const location = body.location ?? body.venue ?? body.location ?? undefined;
    const description = body.description ?? body.desc ?? undefined;
    const skills = body.skills ?? body.tags ?? [];
    const role = body.role ?? undefined;
    const experience = body.experience ?? undefined;
    const logo = body.logo ?? undefined;
    const eligibility = body.eligibility ?? undefined;

    // Basic validation (be tolerant: fill defaults where reasonable)
    if (!hackathonName) {
      return NextResponse.json({ error: 'Missing hackathon title' }, { status: 400 });
    }

    // Normalize skills to string[]
    const normalizedSkills = Array.isArray(skills)
      ? skills.map((s: any) => String(s))
      : typeof skills === 'string' && skills.length
      ? skills.split(',').map(s => s.trim())
      : [];

    let parsedDate = new Date(regDate);
    if (isNaN(parsedDate.getTime())) {
      // fallback to now
      parsedDate = new Date();
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

    // Build the data object separately. Cast to `any` to avoid TypeScript complaints
    // if the Prisma client types haven't been regenerated after schema changes.
    const organizerData: any = {
      teamName: teamName ?? undefined,
      hackathonName,
      regURL,
      hackathonMode,
      memberCount,
      regDate: parsedDate,
      location,
      description,
      skills: normalizedSkills,
      role: role ?? undefined,
      experience: experience ?? undefined,
      logo: logo ?? undefined,
      userId: session.user.id,
    };

    const organizerHackathon = await prisma.organizerHackathon.create({ data: organizerData });

    // Persist eligibility criteria if provided
    if (eligibility) {
      try {
        await prisma.eligibility.create({
          data: {
            organizerHackathonId: organizerHackathon.id,
            criteria: eligibility,
          },
        });
      } catch (eligErr) {
        console.error('Failed to save eligibility criteria', eligErr);
      }
    }

    return NextResponse.json({ organizerHackathon }, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
