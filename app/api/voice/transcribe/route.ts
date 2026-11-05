import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { GoogleGenAI } from '@google/genai';

// In-memory rate limiter per user (20 requests per minute)
const transcribeRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = transcribeRateLimit.get(userId);
  if (!record || now > record.resetAt) {
    transcribeRateLimit.set(userId, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }
  if (record.count >= 20) {
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
        { error: 'Rate limit exceeded: Please wait a moment before sending more voice inputs.' },
        { status: 429 }
      );
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = (formData.get('audio') || formData.get('file')) as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Empty audio recording received' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio exceeds maximum 10 MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString('base64');
    let mimeType = file.type || 'audio/webm';
    if (mimeType.includes(';')) {
      mimeType = mimeType.split(';')[0].trim();
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (apiKey && apiKey !== 'your-gemini-api-key-here') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType || 'audio/webm',
                    data: base64Data,
                  },
                },
                {
                  text: `Listen to this factory worker's audio. Transcribe the spoken question or observation accurately with correct punctuation. Detect whether the speaker spoke in English or Tamil. Return ONLY a valid JSON object:
{"transcript": "the transcribed text", "language": "en" | "ta"}. If the speaker is speaking in Tamil, write the transcript in authentic Tamil script (தமிழ்).`,
                },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const text = response.text || '';
        try {
          const parsed = JSON.parse(text);
          return NextResponse.json({
            transcript: parsed.transcript || '',
            language: parsed.language === 'ta' ? 'ta' : 'en',
          });
        } catch {
          return NextResponse.json({
            transcript: text.trim(),
            language: /[\u0B80-\u0BFF]/.test(text) ? 'ta' : 'en',
          });
        }
      } catch (geminiErr) {
        console.error('Gemini audio transcription error:', geminiErr);
        return NextResponse.json(
          { error: 'AI voice understanding is temporarily unavailable. Please try typing your question.' },
          { status: 503 }
        );
      }
    } else {
      // Local fallback simulation when no Gemini key is set
      return NextResponse.json({
        transcript: 'Lathe #3 tailstock vibration procedure',
        language: 'en',
      });
    }
  } catch (err: unknown) {
    console.error('Transcribe route error:', err);
    return NextResponse.json(
      { error: 'Failed to process voice input. Please try again.' },
      { status: 500 }
    );
  }
}

