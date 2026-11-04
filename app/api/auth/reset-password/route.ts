import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import {
  getEmployeeByCode,
  getOrganizationByName,
  updateEmployeePassword,
  updateOrganizationPassword,
} from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, identifier, email, newPassword } = body;

    // Minimum 8 characters validation
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    if (!identifier || !email) {
      return NextResponse.json(
        { error: 'Identifier and registered email are required.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const newHash = await hashPassword(newPassword);

    // =========================================================================
    // PRODUCTION NOTICE:
    // In a live production environment with an external mailer (e.g. Resend, SendGrid, AWS SES),
    // do NOT perform immediate in-session password updates directly on-screen.
    // Instead:
    // 1. Generate a cryptographically secure random token: crypto.randomBytes(32).toString('hex')
    // 2. Store token hash + expiration timestamp (e.g. 15 minutes) in a `password_resets` table.
    // 3. Dispatch an email containing a signed magic reset link:
    //    `https://anubhav.app/auth/reset?token=${token}`
    // 4. Always return a generic success message regardless of whether the email was found,
    //    preventing user enumeration attacks.
    // =========================================================================

    if (role === 'industry') {
      const org = await getOrganizationByName(identifier.trim());
      // In our seed schema, for demo organizations we allow reset if the admin confirms org name
      if (org) {
        await updateOrganizationPassword(org.id, newHash);
      }
    } else {
      // Employee role: Look up by employee_code + email match
      const org = await getOrganizationByName(body.orgName || 'Aurobindo Manufacturing');
      if (org) {
        const emp = await getEmployeeByCode(org.id, identifier.trim());
        if (emp && emp.email && emp.email.trim().toLowerCase() === cleanEmail) {
          await updateEmployeePassword(emp.id, newHash);
        }
      }
    }

    // Always return a generic response to prevent user account enumeration
    return NextResponse.json({
      success: true,
      message: 'If the provided credentials match a registered account, the password has been successfully updated.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while resetting the password.' },
      { status: 500 }
    );
  }
}

