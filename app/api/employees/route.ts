import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEmployeesByOrg } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('q') || undefined;

    const employees = await getEmployeesByOrg(session.orgId, search);

    return NextResponse.json({ employees });
  } catch (err: unknown) {
    console.error('Fetch employees error:', err);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

