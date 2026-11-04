import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  setSessionCookie,
  verifyPassword,
} from '@/lib/auth';
import {
  getEmployeeByCode,
  getOrganizationByName,
} from '@/lib/db';
import { SessionPayload } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, password } = body;

    if (!role || !password) {
      return NextResponse.json(
        { error: 'Missing required credentials' },
        { status: 400 }
      );
    }

    // 1. Industry Admin Login
    if (role === 'industry') {
      const orgName = (body.orgName || '').trim();
      if (!orgName) {
        return NextResponse.json(
          { error: 'Organization name is required' },
          { status: 400 }
        );
      }

      const rateLimitKey = `login:industry:${orgName.toLowerCase()}`;
      const { allowed, retryAfterSeconds } = checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000);

      if (!allowed) {
        return NextResponse.json(
          { error: `Too many failed attempts. Please try again in ${retryAfterSeconds} seconds.` },
          { status: 429 }
        );
      }

      const org = await getOrganizationByName(orgName);
      if (!org) {
        recordFailedAttempt(rateLimitKey);
        // Generic error message to prevent account enumeration
        return NextResponse.json(
          { error: 'Invalid organization name or password.' },
          { status: 401 }
        );
      }

      const isMatch = await verifyPassword(password, org.password_hash);
      if (!isMatch) {
        recordFailedAttempt(rateLimitKey);
        return NextResponse.json(
          { error: 'Invalid organization name or password.' },
          { status: 401 }
        );
      }

      // Successful login
      resetRateLimit(rateLimitKey);

      const session: SessionPayload = {
        role: 'industry',
        orgId: org.id,
        orgName: org.name,
        name: org.name,
      };

      await setSessionCookie(session);
      return NextResponse.json({ success: true, role: 'industry', redirectUrl: '/app/ask' });
    }

    // 2. Employee Login
    if (role === 'employee') {
      const employeeCode = (body.employeeCode || '').trim();
      const orgName = (body.orgName || 'Aurobindo Manufacturing').trim();

      if (!employeeCode) {
        return NextResponse.json(
          { error: 'Employee User ID is required' },
          { status: 400 }
        );
      }

      const rateLimitKey = `login:employee:${employeeCode.toLowerCase()}`;
      const { allowed, retryAfterSeconds } = checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000);

      if (!allowed) {
        return NextResponse.json(
          { error: `Too many failed attempts. Please try again in ${retryAfterSeconds} seconds.` },
          { status: 429 }
        );
      }

      // Resolve org
      const org = await getOrganizationByName(orgName);
      if (!org) {
        recordFailedAttempt(rateLimitKey);
        return NextResponse.json(
          { error: 'Invalid employee ID or password.' },
          { status: 401 }
        );
      }

      const emp = await getEmployeeByCode(org.id, employeeCode);
      if (!emp || !emp.password_hash) {
        recordFailedAttempt(rateLimitKey);
        return NextResponse.json(
          { error: 'Invalid employee ID or password.' },
          { status: 401 }
        );
      }

      const isMatch = await verifyPassword(password, emp.password_hash);
      if (!isMatch) {
        recordFailedAttempt(rateLimitKey);
        return NextResponse.json(
          { error: 'Invalid employee ID or password.' },
          { status: 401 }
        );
      }

      // Successful login
      resetRateLimit(rateLimitKey);

      const session: SessionPayload = {
        role: 'employee',
        orgId: org.id,
        orgName: org.name,
        employeeId: emp.id,
        employeeCode: emp.employee_code,
        name: emp.full_name,
        avatarUrl: emp.avatar_url,
        email: emp.email,
      };

      await setSessionCookie(session);
      return NextResponse.json({ success: true, role: 'employee', redirectUrl: '/app/ask' });
    }

    return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred.' },
      { status: 500 }
    );
  }
}

