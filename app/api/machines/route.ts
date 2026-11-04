import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createMachine, getMachinesByOrg } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const search = searchParams.get('q') || undefined;
    const category = searchParams.get('category') || undefined;

    const machines = await getMachinesByOrg(session.orgId, search, category);
    return NextResponse.json({ machines });
  } catch (err: unknown) {
    console.error('Fetch machines error:', err);
    return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Server-Side Role Check: Only industry admin can add machines
    if (session.role !== 'industry') {
      return NextResponse.json(
        { error: 'Forbidden: Only plant administrators can add machines to the library.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, category, description, specifications, common_issues, safety_notes, image_url } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Machine name is required' }, { status: 400 });
    }

    const created = await createMachine({
      org_id: session.orgId,
      name: name.trim(),
      category: category?.trim() || 'General',
      description: description?.trim() || '',
      specifications: specifications?.trim() || '',
      common_issues: common_issues?.trim() || '',
      safety_notes: safety_notes?.trim() || '',
      image_url: image_url || '',
    });

    if (!created) {
      return NextResponse.json({ error: 'Failed to create machine' }, { status: 500 });
    }

    return NextResponse.json({ success: true, machine: created });
  } catch (err: unknown) {
    console.error('Create machine error:', err);
    return NextResponse.json({ error: 'Failed to create machine' }, { status: 500 });
  }
}

