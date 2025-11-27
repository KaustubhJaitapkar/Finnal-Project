import { NextResponse } from 'next/server';
import aws from 'aws-sdk';
import fs from 'fs/promises';
import path from 'path';

const s3 = new aws.S3({
  region: process.env.AWS_REGION || 'ap-south-1',
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const logo = form.get('logo') as File | null;

    if (!logo) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await logo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (process.env.BUCKET_NAME) {
      const uploadParams = {
        Bucket: process.env.BUCKET_NAME as string,
        Key: `logos/${Date.now()}-${logo.name}`,
        Body: buffer,
        ContentType: logo.type,
      };

      const uploadResult = await s3.upload(uploadParams).promise();
      return NextResponse.json({ url: uploadResult.Location }, { status: 200 });
    } else {
      // Local fallback
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'logos');
        await fs.mkdir(uploadsDir, { recursive: true });
        const filename = `${Date.now()}-${logo.name}`;
        const filePath = path.join(uploadsDir, filename);
        await fs.writeFile(filePath, buffer);
        const localUrl = `/uploads/logos/${filename}`;
        return NextResponse.json({ url: localUrl }, { status: 200 });
      } catch (err) {
        console.error('Failed to save logo locally', err);
        return NextResponse.json({ error: 'Failed to save logo' }, { status: 500 });
      }
    }
  } catch (err) {
    console.error('Upload logo error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
