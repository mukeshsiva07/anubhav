import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword } from '@/lib/auth';
import { getEmployeeById, updateEmployeePassword } from '@/lib/db';
import crypto from 'crypto';

export async function POST(
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

    const body = await req.json().catch(() => ({}));
    if (body.newPassword && body.newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    const newPassword = body.newPassword || (crypto.randomBytes(4).toString('hex') + 'A9!');

    const newHash = await hashPassword(newPassword);
    const success = await updateEmployeePassword(id, newHash);

    if (!success) {
      return NextResponse.json({ error: 'Failed to reset employee password' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tempPassword: newPassword,
      message: `Password reset successfully for ${existing.full_name}.`,
    });
  } catch (err: unknown) {
    console.error('Admin password reset error:', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}

