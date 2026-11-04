import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword } from '@/lib/auth';
import { createEmployee, getEmployeesByOrg } from '@/lib/db';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'industry') {
      return NextResponse.json({ error: 'Forbidden: Industry Admin access required.' }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const search = searchParams.get('q') || undefined;

    const employees = await getEmployeesByOrg(session.orgId, search);
    return NextResponse.json({ employees });
  } catch (err: unknown) {
    console.error('Admin fetch employees error:', err);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'industry') {
      return NextResponse.json({ error: 'Forbidden: Industry Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { full_name, designation, department, experience_years, phone, email, bio } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ error: 'Employee full name is required' }, { status: 400 });
    }

    // Auto-generate unique employee ID (e.g. EMP-7241)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const employee_code = `EMP-${randomSuffix}`;

    // Auto-generate temporary password (10 alphanumeric chars)
    const tempPassword = crypto.randomBytes(5).toString('hex') + 'A!';
    const password_hash = await hashPassword(tempPassword);

    const created = await createEmployee({
      org_id: session.orgId,
      employee_code,
      password_hash,
      full_name: full_name.trim(),
      designation: designation?.trim() || 'Technician',
      department: department?.trim() || 'Operations',
      experience_years: Math.max(0, parseInt(experience_years, 10) || 0),
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      bio: bio?.trim() || '',
    });

    if (!created) {
      return NextResponse.json({ error: 'Failed to create employee record' }, { status: 500 });
    }

    // Return the plain temporary password ONCE so admin can hand it to the employee
    return NextResponse.json({
      success: true,
      employee: created,
      tempPassword,
    });
  } catch (err: unknown) {
    console.error('Admin create employee error:', err);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}

