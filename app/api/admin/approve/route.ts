import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  approveEntry,
  bulkApproveEntries,
  bulkRejectEntries,
  rejectEntry,
  updateEntry,
} from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'industry') {
      return NextResponse.json({ error: 'Forbidden: Industry Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const { action, id, ids, reason } = body;

    if (action === 'approve') {
      if (!id) return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
      const ok = await approveEntry(id);
      return NextResponse.json({ success: ok });
    }

    if (action === 'reject') {
      if (!id) return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: 'Rejection reason is mandatory.' }, { status: 400 });
      }
      const ok = await rejectEntry(id, reason.trim());
      return NextResponse.json({ success: ok });
    }

    if (action === 'bulk-approve') {
      if (!Array.isArray(ids) || !ids.length) {
        return NextResponse.json({ error: 'IDs array required' }, { status: 400 });
      }
      const ok = await bulkApproveEntries(ids);
      return NextResponse.json({ success: ok });
    }

    if (action === 'bulk-reject') {
      if (!Array.isArray(ids) || !ids.length) {
        return NextResponse.json({ error: 'IDs array required' }, { status: 400 });
      }
      if (!reason || !reason.trim()) {
        return NextResponse.json({ error: 'Rejection reason is mandatory.' }, { status: 400 });
      }
      const ok = await bulkRejectEntries(ids, reason.trim());
      return NextResponse.json({ success: ok });
    }

    if (action === 'revert-to-pending') {
      if (!id) return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
      const ok = await updateEntry(id, {
        status: 'pending',
        approved_at: null,
      });
      return NextResponse.json({ success: !!ok });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Approve action error:', err);
    return NextResponse.json({ error: 'Failed to execute approval action' }, { status: 500 });
  }
}

