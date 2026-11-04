import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  deleteMachine,
  getApprovedEntriesByOrg,
  getMachineById,
  updateMachine,
} from '@/lib/db';

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
    const machine = await getMachineById(id);

    if (!machine || machine.org_id !== session.orgId) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    // Fetch approved entries linked to this machine
    const approvedEntries = await getApprovedEntriesByOrg(session.orgId, { machineId: id });

    return NextResponse.json({ machine, entries: approvedEntries });
  } catch (err: unknown) {
    console.error('Fetch machine detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch machine' }, { status: 500 });
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

    // Role verification: Only industry admin can edit machines
    if (session.role !== 'industry') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getMachineById(id);

    if (!existing || existing.org_id !== session.orgId) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    const body = await req.json();
    const updated = await updateMachine(id, body);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 });
    }

    return NextResponse.json({ success: true, machine: updated });
  } catch (err: unknown) {
    console.error('Update machine error:', err);
    return NextResponse.json({ error: 'Failed to update machine' }, { status: 500 });
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

    if (session.role !== 'industry') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getMachineById(id);

    if (!existing || existing.org_id !== session.orgId) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 });
    }

    const success = await deleteMachine(id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Delete machine error:', err);
    return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 });
  }
}

