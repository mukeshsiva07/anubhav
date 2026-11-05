import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getOrganizationById, updateOrganization } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'industry') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const org = await getOrganizationById(session.orgId);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { password_hash: _p, ...safeOrg } = org;
    return NextResponse.json({ organization: safeOrg });
  } catch (err: unknown) {
    console.error('Fetch organization profile error:', err);
    return NextResponse.json({ error: 'Failed to fetch organization profile' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'industry') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      contact_phone,
      org_email,
      industry_type,
      description,
      admin_name,
      address,
      logo_url,
    } = body;

    const updates: Record<string, any> = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof contact_phone === 'string') updates.contact_phone = contact_phone.trim();
    if (typeof org_email === 'string') updates.org_email = org_email.trim();
    if (typeof industry_type === 'string') updates.industry_type = industry_type.trim();
    if (typeof description === 'string') updates.description = description.trim();
    if (typeof admin_name === 'string') updates.admin_name = admin_name.trim();
    if (typeof address === 'string') updates.address = address.trim();
    if (typeof logo_url === 'string') updates.logo_url = logo_url.trim();

    const updated = await updateOrganization(session.orgId, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update organization profile' }, { status: 500 });
    }

    const { password_hash: _p, ...safeOrg } = updated;
    return NextResponse.json({ success: true, organization: safeOrg });
  } catch (err: unknown) {
    console.error('Update organization profile error:', err);
    return NextResponse.json({ error: 'Failed to update organization profile' }, { status: 500 });
  }
}

