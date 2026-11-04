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

    const { question } = await req.json();
    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const cleanQuestion = question.trim();
    const isIndustry = session.role === 'industry';

    // 1. Retrieve top ~8 most relevant records (full-text + machine matching)
    // If industry admin, include pending entries labeled 'Unverified'
    const { entries, machines } = await searchRelevantRecordsForAI(
      session.orgId,
      cleanQuestion,
      isIndustry
    );

    // If absolutely zero records or machines exist in org
    if (entries.length === 0 && machines.length === 0) {
      await logUnansweredQuestion(session.orgId, cleanQuestion, session.name);
      return NextResponse.json({
        answer: 'No record found. This question has been logged for an expert.',
        sources: [],
        safetyNotes: [],
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

    const systemInstruction =
      "You are Anubhav, a factory knowledge assistant. Answer ONLY using the records provided. Cite the record IDs you used (e.g. [Record ID: ...]). If no record matches, reply exactly: 'No record found. This question has been logged for an expert.' Never guess or invent fixes. Always include any safety notes from the records. Keep answers short and practical for a new employee.";

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
        console.error('Gemini SDK error:', geminiErr);
        // Graceful error handling
        rawAnswer =
          'We encountered a temporary connection issue while querying the AI model. Please try asking your question again in a few moments.';
      }
    } else {
      // Local deterministic simulated response when API key is not yet set
      // Ensures the application remains testable and responsive
      const matchingEntries = entries.filter((e) => {
        const qTerms = cleanQuestion.toLowerCase().split(/\s+/);
        return qTerms.some((t: string) => t.length > 3 && (e.title.toLowerCase().includes(t) || e.content_text.toLowerCase().includes(t)));
      });

      if (matchingEntries.length > 0) {
        const best = matchingEntries[0];
        rawAnswer = `${best.content_text}\n\nCited from [Record ID: ${best.id}]. Always follow standard PPE and lock-out procedures before maintenance.`;
      } else {
        rawAnswer = 'No record found. This question has been logged for an expert.';
      }
    }

    // 3. Check for "No record found"
    const isNotFound = rawAnswer.includes('No record found. This question has been logged for an expert.');
    if (isNotFound) {
      await logUnansweredQuestion(session.orgId, cleanQuestion, session.name);
      return NextResponse.json({
        answer: 'No record found. This question has been logged for an expert.',
        sources: [],
        safetyNotes: [],
      });
    }

    // 4. Resolve Cited Sources
    // Match IDs cited in response, or include top scored records
    const citedEntryIds = new Set<string>();
    for (const e of entries) {
      if (rawAnswer.includes(e.id) || entries.length === 1) {
        citedEntryIds.add(e.id);
      }
    }

    // If Gemini cited without exact ID format, attach matched relevant entries
    if (citedEntryIds.size === 0 && entries.length > 0) {
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
    });
  } catch (err: unknown) {
    console.error('Ask AI route error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your question. Please try again.' },
      { status: 500 }
    );
  }
}
