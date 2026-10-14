import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToS3 } from '@/lib/storage/s3';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
  'image/svg+xml': '.svg',
};

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose a PNG or JPG file.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be 10MB or smaller.' }, { status: 400 });
    }
    const name = file.name.toLowerCase();
    let ext = ALLOWED[file.type];
    if (!ext && name.endsWith('.ico')) ext = '.ico';
    if (!ext && name.endsWith('.svg')) ext = '.svg';
    if (!ext) {
      return NextResponse.json({ error: 'Use PNG, JPG, SVG, or ICO.' }, { status: 400 });
    }

    const folderRaw = String(form.get('folder') || 'offerings').toLowerCase();
    const folder = ['profile', 'offerings', 'categories'].includes(folderRaw) ? folderRaw : 'offerings';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const uploaded = await uploadImageToS3({
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || 'application/octet-stream',
      folder,
      filename,
    });

    return NextResponse.json({
      url: uploaded.url,
      key: uploaded.key,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    console.warn('[uploads] S3 upload failed:', (error as Error).message);
    return NextResponse.json({ error: 'Could not upload image to S3.' }, { status: 500 });
  }
}
