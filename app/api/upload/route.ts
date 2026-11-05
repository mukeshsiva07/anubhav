import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createSignedUploadUrl, uploadMediaFile } from '@/lib/db';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.pptx', '.txt', '.png', '.jpg', '.jpeg', '.webp'];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/webp',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function isAllowedFile(name: string, type?: string): boolean {
  const ext = '.' + name.split('.').pop()?.toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) return true;
  if (type && ALLOWED_MIME_TYPES.includes(type.toLowerCase())) return true;
  return false;
}

// GET /api/upload?name=filename.pdf&type=application/pdf
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const name = searchParams.get('name') || '';
    const type = searchParams.get('type') || 'application/octet-stream';
    const size = parseInt(searchParams.get('size') || '0', 10);

    if (!name || !isAllowedFile(name, type)) {
      return NextResponse.json(
        { error: 'Invalid file format. Allowed: pdf, docx, xlsx, pptx, txt, png, jpg, webp.' },
        { status: 400 }
      );
    }

    if (size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowable limit of 10 MB.' },
        { status: 400 }
      );
    }

    const result = await createSignedUploadUrl(name, type);
    if (result.error || !result.signedUrl) {
      return NextResponse.json(
        { error: result.error || 'Failed to create signed upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: result.signedUrl,
      publicUrl: result.publicUrl,
      path: result.path,
    });
  } catch (err: unknown) {
    console.error('Signed upload error:', err);
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }
}

// POST /api/upload
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';

    // If client requested signed upload URL via JSON body: { fileName, fileType, fileSize }
    if (contentType.includes('application/json')) {
      const body = await req.json();
      const { fileName, fileType, fileSize } = body;

      if (!fileName || !isAllowedFile(fileName, fileType)) {
        return NextResponse.json(
          { error: 'Invalid file type. Allowed: pdf, docx, xlsx, pptx, txt, png, jpg, webp.' },
          { status: 400 }
        );
      }

      if (fileSize && fileSize > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: 'File size exceeds 10 MB limit.' },
          { status: 400 }
        );
      }

      const result = await createSignedUploadUrl(fileName, fileType || 'application/octet-stream');
      if (result.error || !result.signedUrl) {
        return NextResponse.json(
          { error: result.error || 'Failed to create signed upload URL' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        signedUrl: result.signedUrl,
        publicUrl: result.publicUrl,
        path: result.path,
      });
    }

    // Direct multipart form upload (e.g. from canvas photo editor or small file)
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds maximum allowable limit of 10 MB' },
        { status: 400 }
      );
    }

    if (!isAllowedFile(file.name, file.type)) {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG, and WEBP are allowed.' },
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
