import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteEmployee, getEmployeeById, updateEmployee } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'industry') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getEmployeeById(id);

    if (!existing || existing.org_id !== session.orgId) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const body = await req.json();
    const updated = await updateEmployee(id, body);

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
    }

    const { password_hash, ...safeData } = updated;
    return NextResponse.json({ success: true, employee: safeData });
  } catch (err: unknown) {
    console.error('Admin update employee error:', err);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'industry') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getEmployeeById(id);

    if (!existing || existing.org_id !== session.orgId) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // deleteEmployee updates all entries where employee_id = id to:
    // author_name_cache = `${full_name} (Former employee)`
    // employee_id = null
    // then removes the employee row
    const success = await deleteEmployee(id);

    if (!success) {
      return NextResponse.json({ error: 'Failed to remove employee' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Employee removed. Their approved entries were retained and credited to "Former employee".',
    });
  } catch (err: unknown) {
    console.error('Admin delete employee error:', err);
    return NextResponse.json({ error: 'Failed to remove employee' }, { status: 500 });
  }
}

