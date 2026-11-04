import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  createEntry,
  deleteEntry,
  getEntryById,
  updateEntry,
} from '@/lib/db';
import { extractPlainText, sanitizeContent } from '@/lib/sanitize';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const entry = await getEntryById(id);

    if (!entry || entry.org_id !== session.orgId) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Role check: If employee, they can only view approved entries OR their own entries
    if (
      session.role === 'employee' &&
      entry.status !== 'approved' &&
      entry.employee_id !== session.employeeId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot view this unpublished entry.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ entry });
  } catch (err: unknown) {
    console.error('Fetch single entry error:', err);
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getEntryById(id);

    if (!existing || existing.org_id !== session.orgId) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const body = await req.json();
    const isIndustry = session.role === 'industry';
    const isOwner = session.employeeId && existing.employee_id === session.employeeId;

    if (!isIndustry && !isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: You can only edit your own entries.' },
        { status: 403 }
      );
    }

    // If an employee edits an entry that is ALREADY APPROVED:
    // "Editing an approved entry creates a pending revision rather than changing the approved text."
    if (!isIndustry && existing.status === 'approved') {
      const cleanHtml = body.content_html ? sanitizeContent(body.content_html) : existing.content_html;
      const plainText = extractPlainText(cleanHtml);
      const cleanTags = body.tags
        ? Array.isArray(body.tags)
          ? body.tags
          : String(body.tags).split(',').map((t) => t.trim().toLowerCase())
        : existing.tags;

      const revision = await createEntry({
        org_id: session.orgId,
        employee_id: session.employeeId!,
        machine_id: body.machine_id !== undefined ? body.machine_id : existing.machine_id,
        title: body.title ? body.title.trim() : `${existing.title} (Revision)`,
        content_html: cleanHtml,
        content_text: plainText,
        tags: cleanTags,
        is_safety_critical: body.is_safety_critical !== undefined ? !!body.is_safety_critical : existing.is_safety_critical,
        status: 'pending',
      });

      return NextResponse.json({
        success: true,
        isRevision: true,
        message: 'A new pending revision was created for plant admin approval.',
        entry: revision,
      });
    }

    // Otherwise (editing a pending/rejected entry, or admin editing before approval)
    const updates: Record<string, any> = {};

    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.machine_id !== undefined) updates.machine_id = body.machine_id || null;
    if (body.is_safety_critical !== undefined) updates.is_safety_critical = !!body.is_safety_critical;

    if (body.content_html !== undefined) {
      const clean = sanitizeContent(body.content_html);
      updates.content_html = clean;
      updates.content_text = extractPlainText(clean);
    }

    if (body.tags !== undefined) {
      updates.tags = Array.isArray(body.tags)
        ? body.tags
        : String(body.tags)
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);
    }

    // If resubmitting a rejected entry, reset status to pending and clear rejection_reason
    if (!isIndustry && (existing.status === 'rejected' || body.resubmit)) {
      updates.status = 'pending';
      updates.rejection_reason = null;
    }

    const updated = await updateEntry(id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
    }

    return NextResponse.json({ success: true, entry: updated });
  } catch (err: unknown) {
    console.error('Update entry error:', err);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getEntryById(id);

    if (!existing || existing.org_id !== session.orgId) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const isIndustry = session.role === 'industry';
    const isOwner = session.employeeId && existing.employee_id === session.employeeId;

    if (!isIndustry && !isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const success = await deleteEntry(id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Delete entry error:', err);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}

