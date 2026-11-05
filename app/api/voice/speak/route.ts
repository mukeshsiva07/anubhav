import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

// In-memory rate limiter per user (30 requests per minute)
const speakRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = speakRateLimit.get(userId);
  if (!record || now > record.resetAt) {
    speakRateLimit.set(userId, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }
  if (record.count >= 30) {
    return false;
  }
  record.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.employeeId || session.orgId;
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Please wait before requesting more speech synthesis.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { text, language } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text is required for speech' }, { status: 400 });
    }

    const cleanText = text.trim();
    // Detect Tamil script if not explicitly specified
    const isTamil = language === 'ta' || /[\u0B80-\u0BFF]/.test(cleanText);
    const targetLang = isTamil ? 'ta-IN' : 'en-IN';

    // Return the response instructing client to read aloud in targetLang using high-fidelity browser voice
    // or server-synthesized speech
    return NextResponse.json({
      useBrowserSpeech: true,
      lang: targetLang,
      language: isTamil ? 'ta' : 'en',
      text: cleanText,
    });
  } catch (err: unknown) {
    console.error('Speak route error:', err);
    return NextResponse.json(
      { error: 'Failed to initiate text-to-speech.' },
      { status: 500 }
    );
  }
}

