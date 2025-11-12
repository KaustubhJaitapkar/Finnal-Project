import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { mailSender } from '../../../lib/mailSender';
import { auth } from '@/auth';
import aws from 'aws-sdk';
import fs from 'fs/promises';
import path from 'path';

const s3 = new aws.S3({
  region: 'ap-south-1',
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

export async function POST(req: Request) {
  const form = await req.formData();
  const resume = form.get('resume') as File | null;
  const linkedinUrl = form.get('linkedinUrl') as string | null;
  const githubUrl = form.get('githubUrl') as string | null;
  const resumeUrl = form.get('resumeUrl') as string | null;
  const candidateId = form.get('candidateId') as string;
  const postId = form.get('postId') as string;

  // Basic logging to aid debugging of form submissions
    try {
    // Use keys() + Array.from to avoid downlevelIteration issues in older TS targets
    const keys = Array.from(form.keys()).map((k) => String(k));
    // console.log('Apply form keys:', keys.join(', '));
  } catch (err) {
    console.error('Failed to enumerate form keys', err);
  }

  // console.log('resume type:', resume?.type);

  // Validate required fields early and return helpful errors
  if (!candidateId) {
    return NextResponse.json({ error: 'Missing candidateId in form submission' }, { status: 400 });
  }
  if (!postId) {
    return NextResponse.json({ error: 'Missing postId in form submission' }, { status: 400 });
  }

  let uploadResult: aws.S3.ManagedUpload.SendData | null = null;

  try {

    const existingApplication = await prisma.application.findUnique({
      where: {
        candidateId_postId: {
          candidateId,
          postId,
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json({ error: 'You have already applied for this position.' }, { status: 400 });
    }

    if (resume) {
  // console.log("resume type", resume.type);

      const arrayBuffer = await resume.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (process.env.BUCKET_NAME) {
        // Upload to S3 when configured
        const uploadParams = {
          Bucket: process.env.BUCKET_NAME as string,
          Key: `resumes/${Date.now()}-${resume.name}`,
          Body: buffer,
          ContentType: resume.type,
        };

        uploadResult = await s3.upload(uploadParams).promise();
      } else {
        // Local dev fallback: save the file under public/uploads/resumes and return a local URL
        try {
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'resumes');
          await fs.mkdir(uploadsDir, { recursive: true });
          const filename = `${Date.now()}-${resume.name}`;
          const filePath = path.join(uploadsDir, filename);
          await fs.writeFile(filePath, buffer);
          const localUrl = `/uploads/resumes/${filename}`;
          // Mimic S3 upload result shape enough for downstream code
          uploadResult = { Location: localUrl } as any;
          // console.log('Saved resume to local path', filePath);
        } catch (err) {
          console.error('Failed to save resume locally', err);
          return NextResponse.json({ error: 'Failed to save resume on server.' }, { status: 500 });
        }
      }
    }

    // Retrieve server session if available to capture the user's name when creating/updating
    const session = await auth();

    // Ensure user record exists and update profile links; use upsert to avoid P2025 when
    // the user record is missing for some auth flows. If we have session user info, persist name.
    await prisma.user.upsert({
      where: { id: candidateId },
      update: {
        name: session?.user?.name || undefined,
        linkedinUrl: linkedinUrl || '',
        githubUrl: githubUrl || '',
        resumeUrl: (uploadResult ? uploadResult.Location : resumeUrl),
      },
      create: {
        id: candidateId,
        // minimal required fields — `skills` is required in the schema so supply empty array
        skills: [],
        name: session?.user?.name || undefined,
        linkedinUrl: linkedinUrl || '',
        githubUrl: githubUrl || '',
        resumeUrl: (uploadResult ? uploadResult.Location : resumeUrl) || null,
      },
    });

    const application = await prisma.application.create({
      data: {
        candidateId,
        postId,
        linkedinUrl: linkedinUrl || null,
        githubUrl: githubUrl || null,
        resumeUrl: uploadResult ? uploadResult.Location : resumeUrl || null,
      },
    });

    // Notify the post owner (team) about the new application
    try {
      // Try to find an organizer-posted hackathon first, then fallback to legacy Hackathon
      let post: any = await prisma.organizerHackathon.findUnique({ where: { id: postId } });
      if (!post) {
        post = await prisma.hackathon.findUnique({
          where: { id: postId },
          include: { user: true },
        });
      }

      const candidate = await prisma.user.findUnique({ where: { id: candidateId } });

      // Only notify if we have an owner email (legacy Hackathon had user relation)
      if (post?.user?.email) {
        const ownerEmail = post.user.email;
        const candidateName = candidate?.name || candidate?.email || 'A candidate';
        const appResumeUrl = application.resumeUrl || 'Not provided';
        const appLinkedin = application.linkedinUrl || 'Not provided';
        const appGithub = application.githubUrl || 'Not provided';

        const appUrl = process.env.NODE_ENV === 'production' ? 'https://HackMate.vercel.app' : 'http://localhost:3000';
        const viewLink = `${appUrl}/dashboard/requests`; // approximate location where owner can view applications

  const subject = `New application for your team: ${post.teamName || post.hackathonName || 'Your Hackathon Post'}`;
        const body = `<!doctype html>
          <html>
            <body>
              <p>Hi ${post.user.name || ''},</p>
              <p>${candidateName} has applied to join your team for <strong>${post.teamName || post.hackathonName || 'your post'}</strong>.</p>
              <ul>
                <li><strong>Candidate name:</strong> ${candidateName}</li>
                <li><strong>Candidate email:</strong> ${candidate?.email || 'Not provided'}</li>
                <li><strong>LinkedIn:</strong> ${appLinkedin}</li>
                <li><strong>GitHub:</strong> ${appGithub}</li>
                <li><strong>Resume:</strong> <a href="${appResumeUrl}">${appResumeUrl}</a></li>
              </ul>
              <p>You can review the application here: <a href="${viewLink}">${viewLink}</a></p>
              <p>— HackMate</p>
            </body>
          </html>`;

        // send email but don't block the main success path on failure
        try {
          await mailSender(ownerEmail, subject, body);
          // console.log('Owner notified about new application:', ownerEmail);
        } catch (err) {
          console.error('Failed to send application notification email to owner', err);
        }
      }
    } catch (notifyErr) {
      console.error('Failed to send owner notification for application', notifyErr);
    }

    return NextResponse.json({ application }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
