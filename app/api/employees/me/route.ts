import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEmployeeById, updateEmployee } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || !session.employeeId) {
    return NextResponse.json({ error: 'Unauthorized or not an employee' }, { status: 401 });
  }

  const employee = await getEmployeeById(session.employeeId);
  if (!employee) {
    return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  }

  // Omit password hash
  const { password_hash, ...safeData } = employee;
  return NextResponse.json({ employee: safeData });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Security: Whitelist allowed fields for self-edit.
    // Employee cannot change id, org_id, employee_code, or password_hash here.
    const allowedKeys = [
      'full_name',
      'designation',
      'department',
      'experience_years',
      'phone',
      'email',
      'bio',
      'avatar_url',
    ];

    const updates: Record<string, any> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        if (key === 'experience_years') {
          updates[key] = Math.max(0, parseInt(body[key], 10) || 0);
        } else {
          updates[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
        }
      }
    }

    const updated = await updateEmployee(session.employeeId, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    const { password_hash, ...safeData } = updated;
    return NextResponse.json({ success: true, employee: safeData });
  } catch (err: unknown) {
    console.error('Profile update error:', err);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

