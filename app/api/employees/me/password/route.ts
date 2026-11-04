import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword, verifyPassword } from '@/lib/auth';
import { getEmployeeById, updateEmployeePassword } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const emp = await getEmployeeById(session.employeeId);
    if (!emp || !emp.password_hash) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const isMatch = await verifyPassword(currentPassword, emp.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Incorrect current password. Verification failed.' },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);
    const success = await updateEmployeePassword(session.employeeId, newHash);

    if (!success) {
      return NextResponse.json({ error: 'Could not update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err: unknown) {
    console.error('Password change error:', err);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}

