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

    // 1. Retrieve most relevant records (Machine matching first, then Keyword search)
    // If industry admin, include pending entries labeled 'Unverified'
    const { entries, machines, matchedMachine } = await searchRelevantRecordsForAI(
      session.orgId,
      cleanQuestion,
      isIndustry
    );

    // 6. Add console.log of the machine matched and the titles retrieved, to help debugging
    console.log(`[Ask AI] Machine Matched: ${matchedMachine ? matchedMachine.name : 'None'}`);
    console.log(`[Ask AI] Titles Retrieved:`, entries.map((e) => e.title));

    // Check for general conversational greetings or identity queries
    const lowerQ = cleanQuestion.toLowerCase();
    const isGreeting =
      /^(hi|hello|hey|good morning|good afternoon|good evening|who are you|what are you|what is anubhav|வணக்கம்|யார் நீ)\b/i.test(
        lowerQ
      ) ||
      lowerQ === 'hi' ||
      lowerQ === 'hello' ||
      lowerQ === 'who are you';

    // 3. If the retrieved list is empty, do NOT call Gemini.
    if (entries.length === 0 && machines.length === 0) {
      if (isGreeting) {
        return NextResponse.json({
          answer: isTamil
            ? 'வணக்கம்! நான் அனுபவ் (Anubhav), உங்கள் தொழிற்சாலை அறிவு உதவியாளர். ஆலை பதிவுகள் மற்றும் செயல்பாடுகள் பற்றி என்னிடம் கேட்கலாம்.'
            : 'Hello! I am Anubhav, your factory knowledge vault assistant. I can help you with verified shop-floor procedures, machine quirks, and safety protocols.',
          sources: [],
          safetyNotes: [],
          language: isTamil ? 'ta' : 'en',
        });
      }

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

    // 4. Format Context for Gemini (Label every record with machine name, title, id, status, safety flag)
    let contextText = '';
    if (matchedMachine) {
      contextText += `=== MACHINE SPECIFICATIONS & KNOWN ISSUES ===\n`;
      contextText += `Record ID: ${matchedMachine.id}\n`;
      contextText += `Machine: ${matchedMachine.name}\n`;
      contextText += `Title: ${matchedMachine.name} Official Machine Profile\n`;
      contextText += `Status: ${matchedMachine.status || 'active'}\n`;
      contextText += `Safety Flag: ${matchedMachine.safety_notes ? 'YES' : 'NO'}\n`;
      if (matchedMachine.specifications) contextText += `Specifications: ${matchedMachine.specifications}\n`;
      if (matchedMachine.common_issues) contextText += `Common Issues & Operating Quirks: ${matchedMachine.common_issues}\n`;
      if (matchedMachine.safety_notes) contextText += `Safety Notes: ${matchedMachine.safety_notes}\n`;
      if (matchedMachine.description) contextText += `Description: ${matchedMachine.description}\n`;
      contextText += `\n`;
    }

    if (entries.length > 0) {
      contextText += `=== SHOP-FLOOR KNOWLEDGE ENTRIES ===\n`;
      for (const e of entries) {
        const statusLabel = e.status === 'approved' ? 'Approved' : 'Unverified (Pending Review)';
        const authorName = e.employee?.full_name || e.author_name_cache || 'Technician';
        contextText += `Record ID: ${e.id}\n`;
        contextText += `Machine: ${e.machine?.name || matchedMachine?.name || 'General'}\n`;
        contextText += `Title: ${e.title}\n`;
        contextText += `Status: ${statusLabel}\n`;
        contextText += `Safety Flag: ${e.is_safety_critical ? 'YES' : 'NO'}\n`;
        contextText += `Author: ${authorName}\n`;
        contextText += `Content: ${e.content_text}\n\n`;
      }
    }

    const prompt = `QUESTION: "${cleanQuestion}"\n\n${contextText}`;

    const systemInstruction = `You are Anubhav, the plant knowledge vault assistant for smart manufacturing.
1. When asked conversational greetings or "who are you" questions, answer briefly and politely introducing yourself as Anubhav.
2. Use only records about the machine or topic the user asked about. If none of the provided records is about it, reply exactly: "No record found. This question has been logged for an expert." (or in Tamil if question is in Tamil: "எந்தப் பதிவும் கிடைக்கவில்லை. இந்த கேள்வி நிபுணருக்காக பதிவு செய்யப்பட்டுள்ளது."). Do not mention record IDs or UUIDs in your answer text; sources are shown separately. For broad questions about a machine, summarize its known issues and fixes from the records.
3. Language rule: Answer in the EXACT SAME language the user asked in. If the question is in Tamil or contains Tamil script, reply in clear, grammatically correct Tamil script (தமிழ்). If in English, reply in English.
4. Always prioritize safety notices and PPE instructions if present in the matching records.
5. At the very end of your response on a new line, write:
CITED_RECORD_IDS: <comma-separated list of Record IDs you actually used, or none>`;

    let rawAnswer = '';
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (apiKey && apiKey !== 'your-gemini-api-key-here') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const modelsToTry = Array.from(
          new Set([process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'])
        );
        let response;
        let lastErr;

        for (const model of modelsToTry) {
          try {
            response = await ai.models.generateContent({
              model,
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.1,
              },
            });
            if (response?.text) break;
          } catch (e: any) {
            lastErr = e;
            if (e?.status === 503 || e?.status === 404 || e?.status === 429) {
              // Quick backoff before trying next model
              await new Promise((r) => setTimeout(r, 1000));
              continue;
            }
            throw e;
          }
        }

        if (!response && lastErr) throw lastErr;
        rawAnswer = response?.text || '';
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
      // Local deterministic response when API key is not yet configured
      if (isGreeting) {
        rawAnswer = isTamil
          ? 'வணக்கம்! நான் அனுபவ் (Anubhav), உங்கள் தொழிற்சாலை அறிவு உதவியாளர்.'
          : 'Hello! I am Anubhav, your factory knowledge vault assistant.';
      } else if (matchedMachine) {
        rawAnswer = `Information for ${matchedMachine.name}:\n` +
          (matchedMachine.common_issues ? `Known issues: ${matchedMachine.common_issues}\n\n` : '') +
          (entries.length > 0 ? entries.map((e) => `• ${e.title}: ${e.content_text}`).join('\n\n') : '');
      } else if (entries.length > 0) {
        rawAnswer = entries.map((e) => `• ${e.title}: ${e.content_text}`).join('\n\n');
      } else {
        rawAnswer = isTamil
          ? 'எந்தப் பதிவும் கிடைக்கவில்லை. இந்த கேள்வி நிபுணருக்காக பதிவு செய்யப்பட்டுள்ளது.'
          : 'No record found. This question has been logged for an expert.';
      }
    }

    // Parse CITED_RECORD_IDS and strip from prose
    let cleanAnswer = rawAnswer;
    const citedIds = new Set<string>();
    const citedMatch = rawAnswer.match(/CITED_RECORD_IDS:\s*([^\n\r]+)/i);
    if (citedMatch) {
      cleanAnswer = rawAnswer.replace(/CITED_RECORD_IDS:\s*[^\n\r]+/i, '').trim();
      const tokens = citedMatch[1].split(',').map((s) => s.trim()).filter((s) => s && s.toLowerCase() !== 'none');
      for (const t of tokens) {
        citedIds.add(t);
      }
    }

    // Clean any stray UUIDs or [Record ID: ...] tags from answer text
    cleanAnswer = cleanAnswer
      .replace(/\[?Record\s+ID:\s*[^\]\n\r]+\]?/gi, '')
      .replace(/\([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\)/gi, '')
      .trim();

    // 5. After Gemini returns, if the answer is the "No record found" sentence, log it to unanswered_questions and return no sources.
    const isNotFound =
      cleanAnswer.includes('No record found. This question has been logged for an expert.') ||
      cleanAnswer.includes('எந்தப் பதிவும் கிடைக்கவில்லை') ||
      cleanAnswer.toLowerCase().startsWith('no record found');

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

    // Resolve Cited Sources (Structured data)
    let citedSources = entries.filter((e) => citedIds.has(e.id));
    if (citedSources.length === 0 && entries.length > 0) {
      citedSources = entries.slice(0, 3);
    }

    // Extract Safety Notes
    const safetyNotes: string[] = [];
    if (matchedMachine?.safety_notes) {
      safetyNotes.push(`${matchedMachine.name} Safety Note: ${matchedMachine.safety_notes}`);
    }
    for (const source of citedSources) {
      if (source.is_safety_critical) {
        safetyNotes.push(`Critical Safety Notice (${source.title}): Always follow safety protocols.`);
      }
      if (source.machine?.safety_notes && !safetyNotes.some((s) => s.includes(source.machine!.name))) {
        safetyNotes.push(`${source.machine.name} Safety Note: ${source.machine.safety_notes}`);
      }
    }

    return NextResponse.json({
      answer: cleanAnswer,
      sources: citedSources,
      safetyNotes: Array.from(new Set(safetyNotes)),
      language: isTamil || /[\u0B80-\u0BFF]/.test(cleanAnswer) ? 'ta' : 'en',
    });
  } catch (err: unknown) {
    console.error('Ask AI route error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your question. Please try again.' },
      { status: 500 }
    );
  }
}
