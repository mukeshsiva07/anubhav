import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  createEntry,
  getAllEntriesByOrg,
  getApprovedEntriesByOrg,
  getEntriesByEmployee,
  getPendingEntriesByOrg,
} from '@/lib/db';
import { extractPlainText, sanitizeContent } from '@/lib/sanitize';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const isMine = searchParams.get('my') === 'true';
    const status = searchParams.get('status') || undefined;
    const machineId = searchParams.get('machineId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;
    const search = searchParams.get('q') || undefined;
    const safetyOnly = searchParams.get('safety') === 'true';

    // If employee requested their own entries
    if (isMine) {
      if (!session.employeeId) {
        return NextResponse.json({ entries: [] });
      }
      const myEntries = await getEntriesByEmployee(session.employeeId);
      return NextResponse.json({ entries: myEntries });
    }

    // If industry admin is listing entries
    if (session.role === 'industry') {
      const allEntries = await getAllEntriesByOrg(session.orgId, {
        status,
        machineId,
        employeeId,
        search,
        safetyOnly,
      });
      return NextResponse.json({ entries: allEntries });
    }

    // Default for employees: only approved entries across the plant
    const approved = await getApprovedEntriesByOrg(session.orgId, {
      machineId,
      search,
    });
    return NextResponse.json({ entries: approved });
  } catch (err: unknown) {
    console.error('Fetch entries error:', err);
    return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Both employee and industry can create an entry, but employeeId must be valid
    const body = await req.json();
    const {
      title,
      content_html,
      machine_id,
      tags,
      is_safety_critical,
      status = 'pending',
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Entry title is required' }, { status: 400 });
    }

    if (!content_html || !content_html.trim()) {
      return NextResponse.json({ error: 'Entry content is required' }, { status: 400 });
    }

    // Sanitize rich text HTML strictly before storing in database
    const cleanHtml = sanitizeContent(content_html);
    const plainText = extractPlainText(cleanHtml);

    // Process tags
    const cleanTags = Array.isArray(tags)
      ? tags.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean)
      : typeof tags === 'string'
      ? tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

    const created = await createEntry({
      org_id: session.orgId,
      employee_id: session.employeeId || '',
      machine_id: machine_id || null,
      title: title.trim(),
      content_html: cleanHtml,
      content_text: plainText,
      tags: cleanTags,
      is_safety_critical: !!is_safety_critical,
      status: status === 'pending' || status === 'approved' ? status : 'pending',
    });

    if (!created) {
      return NextResponse.json({ error: 'Failed to record entry' }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: created });
  } catch (err: unknown) {
    console.error('Create entry error:', err);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}

