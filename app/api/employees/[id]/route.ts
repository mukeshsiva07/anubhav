import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEmployeeById, getApprovedEntriesByOrg, getEntriesByEmployee } from '@/lib/db';

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
    const employee = await getEmployeeById(id);

    if (!employee || employee.org_id !== session.orgId) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Omit sensitive password hash
    const { password_hash, ...safeEmployee } = employee;

    // Filter entries:
    // If viewing own profile or if requester is industry admin, they might see more,
    // but the rule explicitly states: "employees cannot see other people's pending or rejected entries"
    let entries = [];
    if (session.role === 'industry' || session.employeeId === id) {
      entries = await getEntriesByEmployee(id);
    } else {
      // Only approved entries for this employee
      const allApproved = await getApprovedEntriesByOrg(session.orgId);
      entries = allApproved.filter((e) => e.employee_id === id);
    }

    return NextResponse.json({ employee: safeEmployee, entries });
  } catch (err: unknown) {
    console.error('Fetch employee detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

