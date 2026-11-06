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

export async function updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization | null> {
  const supabase = getSupabaseAdmin();
  const { id: _id, password_hash: _p, created_at: _c, ...safeUpdates } = updates;
  const { data, error } = await supabase
    .from('organizations')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating organization:', error);
    return null;
  }
  return data;
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
    .select('id, org_id, employee_code, full_name, designation, department, experience_years, phone, email, joined_on, bio, avatar_url, created_at, is_senior')
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
  is_senior?: boolean;
  status?: 'active' | 'suspended';
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
      employee:employees(id, full_name, designation, avatar_url, is_senior),
      machine:machines(id, name, category, status, department)
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
      employee:employees(id, full_name, designation, avatar_url, is_senior),
      machine:machines(id, name, category, status, department)
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
      employee:employees(id, full_name, designation, avatar_url, is_senior),
      machine:machines(id, name, category, status, department)
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
  thumbnail_url?: string | null;
  attachments?: any[];
}): Promise<Entry | null> {
  const supabase = getSupabaseAdmin();
  const { data: created, error } = await supabase
    .from('entries')
    .insert([{
      ...data,
      tags: data.tags || [],
      is_safety_critical: !!data.is_safety_critical,
      status: data.status || 'pending',
      thumbnail_url: data.thumbnail_url || null,
      attachments: data.attachments || [],
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
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[#.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) dp[i] = [i];
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function wordMatches(qw: string, mw: string): boolean {
  if (qw === mw) return true;
  if (qw.length >= 5 && mw.length >= 5) {
    return levenshteinDistance(qw, mw) <= 2;
  }
  if (qw.length === 4 && mw.length === 4) {
    return levenshteinDistance(qw, mw) <= 1;
  }
  return false;
}

function findMatchingMachine(allMachines: Machine[], question: string): Machine | null {
  const normQ = normalizeText(question);
  const qWords = normQ.split(' ').filter(Boolean);

  let bestMachine: Machine | null = null;
  let highestScore = 0;

  for (const m of allMachines) {
    const normM = normalizeText(m.name);
    const mWords = normM.split(' ').filter(Boolean);

    let score = 0;

    // 1. Check contiguous n-gram matching in question
    for (let len = mWords.length; len >= 2; len--) {
      for (let mStart = 0; mStart <= mWords.length - len; mStart++) {
        const mSub = mWords.slice(mStart, mStart + len);
        for (let qStart = 0; qStart <= qWords.length - len; qStart++) {
          const qSub = qWords.slice(qStart, qStart + len);
          let allMatch = true;
          for (let i = 0; i < len; i++) {
            if (!wordMatches(qSub[i], mSub[i])) {
              allMatch = false;
              break;
            }
          }
          if (allMatch) {
            score = Math.max(score, 50 * len);
          }
        }
      }
    }

    // 2. Check distinctive single words
    const distinctiveWords = mWords.filter(
      (w) =>
        w.length >= 3 &&
        !['industrial', 'plant', 'unit', 'the', 'and', 'for'].includes(w) &&
        !/^\d+$/.test(w) &&
        w !== 'a'
    );

    let distinctiveMatches = 0;
    for (const mw of distinctiveWords) {
      if (qWords.some((qw) => wordMatches(qw, mw))) {
        distinctiveMatches++;
      }
    }

    if (distinctiveMatches > 0) {
      const ratio = distinctiveMatches / distinctiveWords.length;
      score = Math.max(score, 25 * distinctiveMatches + (ratio === 1 ? 25 : 0));

      const identifiers = mWords.filter((w) => /^\d+$/.test(w) || w.length === 1);
      for (const idf of identifiers) {
        if (qWords.includes(idf)) {
          score += 15;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMachine = m;
    }
  }

  if (highestScore >= 20) {
    return bestMachine;
  }
  return null;
}

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing',
  'don\'t', 'down', 'during', 'each', 'few', 'fix', 'fixes', 'fixing', 'fixed', 'for', 'from', 'further',
  'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s',
  'help', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
  'just', 'know', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'now',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'please', 'problem', 'problems', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s',
  'should', 'shouldn\'t', 'so', 'some', 'such', 'tell', 'than', 'that', 'that\'s', 'the', 'their',
  'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll',
  'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very',
  'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s',
  'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s',
  'with', 'won\'t', 'work', 'works', 'working', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
  'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves'
]);

export async function searchRelevantRecordsForAI(
  orgId: string,
  queryText: string,
  includePending = false
): Promise<{
  entries: Entry[];
  machines: Machine[];
  matchedMachine: Machine | null;
}> {
  const supabase = getSupabaseAdmin();

  // 1. Machine matching first
  const { data: allMachines } = await supabase
    .from('machines')
    .select('*')
    .eq('org_id', orgId);

  const matchedMachine = findMatchingMachine(allMachines || [], queryText);

  if (matchedMachine) {
    let entryQuery = supabase
      .from('entries')
      .select(`
        *,
        employee:employees(id, full_name, designation, avatar_url),
        machine:machines(id, name, category, safety_notes)
      `)
      .eq('org_id', orgId)
      .eq('machine_id', matchedMachine.id);

    if (!includePending) {
      entryQuery = entryQuery.eq('status', 'approved');
    } else {
      entryQuery = entryQuery.in('status', ['approved', 'pending']);
    }

    const { data: machineEntries, error } = await entryQuery
      .order('created_at', { ascending: false })
      .limit(8);

    if (error) {
      console.error('Error fetching entries for matched machine:', error);
    }

    return {
      entries: machineEntries || [],
      machines: [matchedMachine],
      matchedMachine,
    };
  }

  // 2. Keyword search for questions with no machine match
  const rawWords = normalizeText(queryText).split(' ').filter(Boolean);
  const meaningfulWords = rawWords.filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  if (meaningfulWords.length === 0) {
    return {
      entries: [],
      machines: [],
      matchedMachine: null,
    };
  }

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

  const orConditions = meaningfulWords
    .flatMap((w) => [`title.ilike.%${w}%`, `content_text.ilike.%${w}%`])
    .join(',');

  const { data: candidates, error } = await entryQuery.or(orConditions);

  if (error || !candidates || candidates.length === 0) {
    return {
      entries: [],
      machines: [],
      matchedMachine: null,
    };
  }

  // Rank by number of matching words
  const scoredEntries = candidates.map((entry) => {
    const haystack = `${entry.title || ''} ${entry.content_text || ''} ${(entry.tags || []).join(' ')}`.toLowerCase();
    let matchCount = 0;
    for (const word of meaningfulWords) {
      if (haystack.includes(word)) {
        matchCount++;
      }
    }
    return { entry, matchCount };
  });

  const topEntries = scoredEntries
    .filter((item) => item.matchCount > 0)
    .sort(
      (a, b) =>
        b.matchCount - a.matchCount ||
        new Date(b.entry.created_at).getTime() - new Date(a.entry.created_at).getTime()
    )
    .slice(0, 8)
    .map((item) => item.entry);

  return {
    entries: topEntries,
    machines: [],
    matchedMachine: null,
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

export async function createSignedUploadUrl(
  fileName: string,
  contentType: string
): Promise<{ signedUrl: string | null; publicUrl: string | null; path: string | null; error: string | null }> {
  try {
    const supabase = getSupabaseAdmin();
    const uniquePath = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const { data, error } = await supabase.storage
      .from('anubhav-media')
      .createSignedUploadUrl(uniquePath);

    if (error || !data) {
      console.error('Supabase signed upload URL error:', error);
      return { signedUrl: null, publicUrl: null, path: null, error: error?.message || 'Failed to create signed URL' };
    }

    const { data: publicUrlData } = supabase.storage
      .from('anubhav-media')
      .getPublicUrl(uniquePath);

    return {
      signedUrl: data.signedUrl,
      publicUrl: publicUrlData.publicUrl,
      path: uniquePath,
      error: null,
    };
  } catch (err: unknown) {
    console.error('Failed to create signed upload url:', err);
    return { signedUrl: null, publicUrl: null, path: null, error: (err as Error).message || 'Failed' };
  }
}

