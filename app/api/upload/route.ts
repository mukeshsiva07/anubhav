import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { uploadMediaFile } from '@/lib/db';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/gif',
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Security Check: File Size Limit (Max 5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowable limit of 5 MB' },
        { status: 400 }
      );
    }

    // Security Check: MIME Type Whitelist
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file format. Only JPEG, PNG, WEBP, SVG, and GIF are allowed.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { url, error } = await uploadMediaFile(buffer, file.name, file.type);

    if (error || !url) {
      return NextResponse.json(
        { error: error || 'Failed to upload media to storage bucket.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, url });
  } catch (err: unknown) {
    console.error('File upload error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Server error during upload.' },
      { status: 500 }
    );
  }
}

