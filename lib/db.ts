import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Employee, Entry, Machine, Organization, UnansweredQuestion } from './types';

// Lazy-initialize the Supabase admin client strictly using the service role key.
// Never expose this client to the browser.
let supabaseAdminInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (supabaseAdminInstance) return supabaseAdminInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceKey) {
    // If during build time env vars are missing, create a placeholder client to avoid throwing on import
    console.warn('[DB] Supabase URL or Service Role Key missing. Database operations will fail if called.');
  }

  supabaseAdminInstance = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabaseAdminInstance;
}

// -----------------------------------------------------------------------------
// Organization Operations
// -----------------------------------------------------------------------------
export async function getOrganizationByName(name: string): Promise<Organization | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .ilike('name', name.trim())
    .maybeSingle();

  if (error) {
    console.error('Error fetching organization by name:', error);
    return null;
  }
  return data;
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching organization by ID:', error);
    return null;
  }
  return data;
}

export async function updateOrganizationPassword(id: string, passwordHash: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('organizations')
    .update({ password_hash: passwordHash })
    .eq('id', id);

  if (error) {
    console.error('Error updating organization password:', error);
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// Employee Operations
// -----------------------------------------------------------------------------
export async function getEmployeeByCode(orgId: string, employeeCode: string): Promise<Employee | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('org_id', orgId)
    .eq('employee_code', employeeCode.trim())
    .maybeSingle();

  if (error) {
    console.error('Error fetching employee by code:', error);
    return null;
  }
  return data;
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching employee by ID:', error);
    return null;
  }
  return data;
}

export async function getEmployeesByOrg(orgId: string, search?: string): Promise<Employee[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('employees')
    .select('id, org_id, employee_code, full_name, designation, department, experience_years, phone, email, joined_on, bio, avatar_url, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`full_name.ilike.${term},designation.ilike.${term},department.ilike.${term},employee_code.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching employees by org:', error);
    return [];
  }
  return data || [];
}

export async function createEmployee(data: {
  org_id: string;
  employee_code: string;
  password_hash: string;
  full_name: string;
  designation?: string;
  department?: string;
  experience_years?: number;
  phone?: string;
  email?: string;
  joined_on?: string;
  bio?: string;
  avatar_url?: string;
}): Promise<Employee | null> {
  const supabase = getSupabaseAdmin();
  const { data: created, error } = await supabase
    .from('employees')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Error creating employee:', error);
    return null;
  }
  return created;
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | null> {
  const supabase = getSupabaseAdmin();
  // Ensure we don't accidentally update id or org_id
  const { id: _id, org_id: _orgId, created_at: _c, ...safeUpdates } = updates;

  const { data, error } = await supabase
    .from('employees')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating employee:', error);
    return null;
  }
  return data;
}

export async function updateEmployeePassword(id: string, passwordHash: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('employees')
    .update({ password_hash: passwordHash })
    .eq('id', id);

  if (error) {
    console.error('Error updating employee password:', error);
    return false;
  }
  return true;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch employee name to preserve in entries author_name_cache
  const { data: emp } = await supabase
    .from('employees')
    .select('full_name')
    .eq('id', id)
    .single();

  const authorLabel = emp?.full_name ? `${emp.full_name} (Former employee)` : 'Former employee';

  // 2. Keep approved/pending entries, set author cache and unlink employee_id
  await supabase
    .from('entries')
    .update({
      author_name_cache: authorLabel,
      employee_id: null,
    })
    .eq('employee_id', id);

  // 3. Delete employee record
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting employee:', error);
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// Machine Operations
// -----------------------------------------------------------------------------
export async function getMachinesByOrg(orgId: string, search?: string, category?: string): Promise<Machine[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('machines')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true });

  if (category && category !== 'All') {
    query = query.eq('category', category);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`name.ilike.${term},description.ilike.${term},category.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching machines:', error);
    return [];
  }
  return data || [];
}

export async function getMachineById(id: string): Promise<Machine | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching machine by ID:', error);
    return null;
  }
  return data;
}

export async function createMachine(data: Omit<Machine, 'id' | 'updated_at'>): Promise<Machine | null> {
  const supabase = getSupabaseAdmin();
  const { data: created, error } = await supabase
    .from('machines')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Error creating machine:', error);
    return null;
  }
  return created;
}

export async function updateMachine(id: string, updates: Partial<Machine>): Promise<Machine | null> {
  const supabase = getSupabaseAdmin();
  const { id: _id, org_id: _orgId, ...safeUpdates } = updates;

  const { data, error } = await supabase
    .from('machines')
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating machine:', error);
    return null;
  }
  return data;
}

export async function deleteMachine(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('machines')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting machine:', error);
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// Entry Operations
// -----------------------------------------------------------------------------
export async function getApprovedEntriesByOrg(orgId: string, options?: {
  machineId?: string;
  tag?: string;
  search?: string;
}): Promise<Entry[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('entries')
    .select(`
      *,
      employee:employees(id, full_name, designation, avatar_url),
      machine:machines(id, name, category)
    `)
    .eq('org_id', orgId)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false, nullsFirst: false });

  if (options?.machineId) {
    query = query.eq('machine_id', options.machineId);
  }

  if (options?.tag) {
    query = query.contains('tags', [options.tag]);
  }

  if (options?.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    query = query.or(`title.ilike.${term},content_text.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching approved entries:', error);
    return [];
  }
  return data || [];
}

export async function getEntriesByEmployee(employeeId: string): Promise<Entry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('entries')
    .select(`
      *,
      machine:machines(id, name, category)
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching employee entries:', error);
    return [];
  }
  return data || [];
}

export async function getPendingEntriesByOrg(orgId: string): Promise<Entry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('entries')
    .select(`
      *,
      employee:employees(id, full_name, designation, avatar_url),
      machine:machines(id, name, category)
    `)
    .eq('org_id', orgId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending entries:', error);
    return [];
  }
  return data || [];
}

export async function getAllEntriesByOrg(orgId: string, options?: {
  status?: string;
  machineId?: string;
  employeeId?: string;
  search?: string;
  safetyOnly?: boolean;
}): Promise<Entry[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('entries')
    .select(`
      *,
      employee:employees(id, full_name, designation, avatar_url),
      machine:machines(id, name, category)
    `)
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  if (options?.machineId && options.machineId !== 'all') {
    query = query.eq('machine_id', options.machineId);
  }

  if (options?.employeeId && options.employeeId !== 'all') {
    query = query.eq('employee_id', options.employeeId);
  }

  if (options?.safetyOnly) {
    query = query.eq('is_safety_critical', true);
  }

  if (options?.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    query = query.or(`title.ilike.${term},content_text.ilike.${term}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching all entries by org:', error);
    return [];
  }
  return data || [];
}

export async function getEntryById(id: string): Promise<Entry | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('entries')
    .select(`
      *,
      employee:employees(id, full_name, designation, avatar_url),
      machine:machines(id, name, category, safety_notes)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching entry by ID:', error);
    return null;
  }
  return data;
}

export async function createEntry(data: {
  org_id: string;
  employee_id: string;
  machine_id: string | null;
  title: string;
  content_html: string;
  content_text: string;
  tags?: string[];
  is_safety_critical?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
}): Promise<Entry | null> {
  const supabase = getSupabaseAdmin();
  const { data: created, error } = await supabase
    .from('entries')
    .insert([{
      ...data,
      tags: data.tags || [],
      is_safety_critical: !!data.is_safety_critical,
      status: data.status || 'pending',
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating entry:', error);
    return null;
  }
  return created;
}

export async function updateEntry(id: string, updates: Partial<Entry>): Promise<Entry | null> {
  const supabase = getSupabaseAdmin();
  const { id: _id, org_id: _orgId, created_at: _c, ...safeUpdates } = updates;

  const { data, error } = await supabase
    .from('entries')
    .update({ ...safeUpdates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating entry:', error);
    return null;
  }
  return data;
}

export async function approveEntry(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('entries')
    .update({
      status: 'approved',
      rejection_reason: null,
      approved_at: now,
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    console.error('Error approving entry:', error);
    return false;
  }
  return true;
}

export async function rejectEntry(id: string, reason: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('entries')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    console.error('Error rejecting entry:', error);
    return false;
  }
  return true;
}

export async function bulkApproveEntries(ids: string[]): Promise<boolean> {
  if (!ids.length) return true;
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('entries')
    .update({
      status: 'approved',
      rejection_reason: null,
      approved_at: now,
      updated_at: now,
    })
    .in('id', ids);

  if (error) {
    console.error('Error bulk approving entries:', error);
    return false;
  }
  return true;
}

export async function bulkRejectEntries(ids: string[], reason: string): Promise<boolean> {
  if (!ids.length) return true;
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('entries')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      updated_at: now,
    })
    .in('id', ids);

  if (error) {
    console.error('Error bulk rejecting entries:', error);
    return false;
  }
  return true;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting entry:', error);
    return false;
  }
  return true;
}

// -----------------------------------------------------------------------------
// AI Retrieval & Search
// -----------------------------------------------------------------------------
export async function searchRelevantRecordsForAI(
  orgId: string,
  queryText: string,
  includePending = false
): Promise<{
  entries: Entry[];
  machines: Machine[];
}> {
  const supabase = getSupabaseAdmin();
  const cleanQuery = queryText.trim();
  const terms = cleanQuery
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);

  // 1. Fetch machines in the org to match against
  const { data: allMachines } = await supabase
    .from('machines')
    .select('*')
    .eq('org_id', orgId);

  const matchedMachines = (allMachines || []).filter(m => {
    const combined = `${m.name} ${m.category} ${m.description} ${m.specifications} ${m.common_issues} ${m.safety_notes}`.toLowerCase();
    return terms.some(t => combined.includes(t)) || combined.includes(cleanQuery.toLowerCase());
  });

  // 2. Fetch candidate entries
  let entryQuery = supabase
    .from('entries')
    .select(`
      *,
      employee:employees(id, full_name, designation, avatar_url),
      machine:machines(id, name, category, safety_notes)
    `)
    .eq('org_id', orgId);

  if (!includePending) {
    entryQuery = entryQuery.eq('status', 'approved');
  } else {
    entryQuery = entryQuery.in('status', ['approved', 'pending']);
  }

  const { data: allCandidates, error } = await entryQuery;
  if (error || !allCandidates) {
    console.error('Error retrieving candidate entries for AI:', error);
    return { entries: [], machines: matchedMachines.slice(0, 3) };
  }

  // Score candidates based on term frequency, machine match, title match, safety critical
  const matchedMachineIds = new Set(matchedMachines.map(m => m.id));
  const scoredEntries = allCandidates.map(entry => {
    let score = 0;
    const titleLower = (entry.title || '').toLowerCase();
    const contentLower = (entry.content_text || '').toLowerCase();
    const tagsLower = (entry.tags || []).join(' ').toLowerCase();

    // Exact query bonus
    if (contentLower.includes(cleanQuery.toLowerCase())) score += 5;
    if (titleLower.includes(cleanQuery.toLowerCase())) score += 8;

    // Term matches
    for (const term of terms) {
      if (titleLower.includes(term)) score += 3;
      if (tagsLower.includes(term)) score += 2;
      if (contentLower.includes(term)) score += 1;
    }

    // Machine match bonus
    if (entry.machine_id && matchedMachineIds.has(entry.machine_id)) {
      score += 4;
    }

    // Safety critical importance
    if (entry.is_safety_critical) {
      score += 1;
    }

    return { entry, score };
  });

  // Sort descending by score, take top ~8
  scoredEntries.sort((a, b) => b.score - a.score);
  const topEntries = scoredEntries
    .filter(item => item.score > 0)
    .slice(0, 8)
    .map(item => item.entry);

  // If no term score matched but entries exist, return up to 4 recent approved entries
  const finalEntries = topEntries.length > 0 ? topEntries : allCandidates.slice(0, 4);

  return {
    entries: finalEntries,
    machines: matchedMachines.slice(0, 4),
  };
}

// -----------------------------------------------------------------------------
// Unanswered Questions
// -----------------------------------------------------------------------------
export async function logUnansweredQuestion(
  orgId: string,
  question: string,
  askedBy: string
): Promise<UnansweredQuestion | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('unanswered_questions')
    .insert([{
      org_id: orgId,
      question: question.trim(),
      asked_by: askedBy,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error logging unanswered question:', error);
    return null;
  }
  return data;
}

// -----------------------------------------------------------------------------
// Storage Bucket (anubhav-media)
// -----------------------------------------------------------------------------
export async function uploadMediaFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin();
    const uniquePath = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage
      .from('anubhav-media')
      .upload(uniquePath, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return { url: null, error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from('anubhav-media')
      .getPublicUrl(uniquePath);

    return { url: publicUrlData.publicUrl, error: null };
  } catch (err: unknown) {
    console.error('Failed to upload file to storage:', err);
    return { url: null, error: (err as Error).message || 'Upload failed' };
  }
}

