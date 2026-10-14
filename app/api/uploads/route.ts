import { NextRequest, NextResponse } from 'next/server';
import { uploadImageToS3 } from '@/lib/storage/s3';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024;
const TYPE_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
  'image/svg+xml': '.svg',
};

function extFromFile(file: File) {
  const type = String(file.type || '').toLowerCase();
  if (TYPE_EXT[type]) return TYPE_EXT[type];
  const name = String(file.name || '').toLowerCase();
  if (name.endsWith('.png')) return '.png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return '.jpg';
  if (name.endsWith('.webp')) return '.webp';
  if (name.endsWith('.gif')) return '.gif';
  if (name.endsWith('.svg')) return '.svg';
  if (name.endsWith('.ico')) return '.ico';
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const raw = form.get('file');
    if (!raw || typeof raw === 'string' || typeof (raw as File).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Choose a PNG or JPG file.' }, { status: 400 });
    }
    const file = raw as File;
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be 8MB or smaller.' }, { status: 400 });
    }
    const ext = extFromFile(file);
    if (!ext) {
      return NextResponse.json({ error: 'Use PNG, JPG, WEBP, GIF, or SVG.' }, { status: 400 });
    }

    const folderRaw = String(form.get('folder') || 'offerings').toLowerCase();
    const folder = ['profile', 'offerings', 'categories'].includes(folderRaw) ? folderRaw : 'offerings';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const uploaded = await uploadImageToS3({
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || (ext === '.png' ? 'image/png' : 'image/jpeg'),
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
    const message = (error as Error).message || 'Could not upload image to S3.';
    console.warn('[uploads] S3 upload failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
