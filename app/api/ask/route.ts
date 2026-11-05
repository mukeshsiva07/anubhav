import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logUnansweredQuestion, searchRelevantRecordsForAI } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';

// In-memory rate limiter per user (30 requests per minute)
const askRateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkUserAskRateLimit(userId: string): boolean {
  const now = Date.now();
  const record = askRateLimitMap.get(userId);
  if (!record || now > record.resetAt) {
    askRateLimitMap.set(userId, { count: 1, resetAt: now + 60 * 1000 });
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
    if (!checkUserAskRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Please wait a moment before sending more queries.' },
        { status: 429 }
      );
    }

    const { question, language: preferredLang } = await req.json();
    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const cleanQuestion = question.trim();
    const isIndustry = session.role === 'industry';
    const isTamil = preferredLang === 'ta' || /[\u0B80-\u0BFF]/.test(cleanQuestion);

    // 1. Retrieve top ~8 most relevant records (full-text + machine matching)
    // If industry admin, include pending entries labeled 'Unverified'
    const { entries, machines } = await searchRelevantRecordsForAI(
      session.orgId,
      cleanQuestion,
      isIndustry
    );

    // Check for general conversational greetings or identity queries
    const lowerQ = cleanQuestion.toLowerCase();
    const isGreeting =
      /^(hi|hello|hey|good morning|good afternoon|good evening|who are you|what are you|what is anubhav|வணக்கம்|யார் நீ)\b/i.test(
        lowerQ
      ) ||
      lowerQ === 'hi' ||
      lowerQ === 'hello' ||
      lowerQ === 'who are you';

    // If zero records found and not a simple greeting
    if (entries.length === 0 && machines.length === 0 && !isGreeting) {
      await logUnansweredQuestion(session.orgId, cleanQuestion, session.name);
      return NextResponse.json({
        answer: isTamil
          ? 'எந்தப் பதிவும் கிடைக்கவில்லை. இந்த கேள்வி நிபுணருக்காக பதிவு செய்யப்பட்டுள்ளது.'
          : 'No record found. This question has been logged for an expert.',
        sources: [],
        safetyNotes: [],
        language: isTamil ? 'ta' : 'en',
      });
    }

    // 2. Format Context for Gemini
    let contextText = '=== PLANT EQUIPMENT LIBRARY ===\n';
    for (const m of machines) {
      contextText += `[Machine ID: ${m.id}]\nName: ${m.name}\nCategory: ${m.category}\nSpecs: ${m.specifications}\nCommon Issues: ${m.common_issues}\nSafety Notes: ${m.safety_notes}\n\n`;
    }

    contextText += '=== SHOP-FLOOR KNOWLEDGE ENTRIES ===\n';
    for (const e of entries) {
      const statusLabel = e.status === 'approved' ? 'Approved' : 'Unverified (Pending Review)';
      const authorName = e.employee?.full_name || e.author_name_cache || 'Technician';
      contextText += `[Record ID: ${e.id}]\nTitle: ${e.title}\nMachine: ${e.machine?.name || 'General'}\nStatus: ${statusLabel}\nAuthor: ${authorName}\nSafety Critical: ${e.is_safety_critical ? 'YES' : 'NO'}\nContent: ${e.content_text}\n\n`;
    }

    const prompt = `QUESTION FROM OPERATOR: "${cleanQuestion}"\n\n${contextText}`;

    const systemInstruction = `You are Anubhav, the plant knowledge vault assistant for smart manufacturing.
1. When asked conversational greetings or "who are you" questions, answer briefly and politely introducing yourself as Anubhav, and state you are here to assist with approved factory knowledge and machine operating wisdom.
2. For all factory, operational, troubleshooting, or machine questions: Answer ONLY using the records provided. Cite the record IDs you used (e.g. [Record ID: ...]).
3. If no record matches a factual factory question, reply exactly: "No record found. This question has been logged for an expert." (or in Tamil if question is in Tamil: "எந்தப் பதிவும் கிடைக்கவில்லை. இந்த கேள்வி நிபுணருக்காக பதிவு செய்யப்பட்டுள்ளது."). Never guess or invent fixes.
4. Language rule: Answer in the EXACT SAME language the user asked in. If the question is in Tamil or contains Tamil script, reply in clear, grammatically correct Tamil script (தமிழ்). If in English, reply in English.
5. Always include any safety notes from the records. Keep answers short, practical, and clear for factory personnel.`;

    let rawAnswer = '';
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (apiKey && apiKey !== 'your-gemini-api-key-here') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.1,
          },
        });
        rawAnswer = response.text || '';
      } catch (geminiErr) {
        console.error('Gemini API error in /api/ask:', geminiErr);
        return NextResponse.json({
          answer: 'The AI service is unavailable, please try again.',
          sources: [],
          safetyNotes: [],
          language: isTamil ? 'ta' : 'en',
          isAiError: true,
        });
      }
    } else {
      // Local deterministic simulated response when API key is not yet configured
      if (isGreeting) {
        rawAnswer = isTamil
          ? 'வணக்கம்! நான் அனுபவ் (Anubhav), உங்கள் தொழிற்சாலை அறிவு உதவியாளர். இயந்திர நுணுக்கங்கள் மற்றும் ஆலை பதிவுகள் பற்றி என்னிடம் கேட்கலாம்.'
          : 'Hello! I am Anubhav, your factory knowledge assistant. I can help you with approved shop-floor procedures, machine quirks, and safety protocols.';
      } else {
        const matchingEntries = entries.filter((e) => {
          const qTerms = cleanQuestion.toLowerCase().split(/\s+/);
          return qTerms.some(
            (t: string) =>
              t.length > 3 &&
              (e.title.toLowerCase().includes(t) || e.content_text.toLowerCase().includes(t))
          );
        });

        if (matchingEntries.length > 0) {
          const best = matchingEntries[0];
          rawAnswer = `${best.content_text}\n\nCited from [Record ID: ${best.id}]. Always follow standard PPE and lock-out procedures before maintenance.`;
        } else {
          rawAnswer = isTamil
            ? 'எந்தப் பதிவும் கிடைக்கவில்லை. இந்த கேள்வி நிபுணருக்காக பதிவு செய்யப்பட்டுள்ளது.'
            : 'No record found. This question has been logged for an expert.';
        }
      }
    }

    // 3. Check for "No record found"
    const isNotFound =
      rawAnswer.includes('No record found. This question has been logged for an expert.') ||
      rawAnswer.includes('எந்தப் பதிவும் கிடைக்கவில்லை');

    if (isNotFound) {
      await logUnansweredQuestion(session.orgId, cleanQuestion, session.name);
      return NextResponse.json({
        answer: isTamil
          ? 'எந்தப் பதிவும் கிடைக்கவில்லை. இந்த கேள்வி நிபுணருக்காக பதிவு செய்யப்பட்டுள்ளது.'
          : 'No record found. This question has been logged for an expert.',
        sources: [],
        safetyNotes: [],
        language: isTamil ? 'ta' : 'en',
      });
    }

    // 4. Resolve Cited Sources
    const citedEntryIds = new Set<string>();
    for (const e of entries) {
      if (rawAnswer.includes(e.id) || (entries.length === 1 && !isGreeting)) {
        citedEntryIds.add(e.id);
      }
    }

    if (citedEntryIds.size === 0 && entries.length > 0 && !isGreeting) {
      entries.slice(0, 3).forEach((e) => citedEntryIds.add(e.id));
    }

    const citedSources = entries.filter((e) => citedEntryIds.has(e.id));

    // 5. Extract Safety Notes
    const safetyNotes: string[] = [];
    for (const source of citedSources) {
      if (source.is_safety_critical) {
        safetyNotes.push(`Critical Safety Notice (${source.title}): Always follow safety protocols.`);
      }
      if (source.machine?.safety_notes) {
        safetyNotes.push(`${source.machine.name} Safety Note: ${source.machine.safety_notes}`);
      }
    }

    return NextResponse.json({
      answer: rawAnswer,
      sources: citedSources,
      safetyNotes: Array.from(new Set(safetyNotes)),
      language: isTamil || /[\u0B80-\u0BFF]/.test(rawAnswer) ? 'ta' : 'en',
    });
  } catch (err: unknown) {
    console.error('Ask AI route error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your question. Please try again.' },
      { status: 500 }
    );
  }
}
