export type UserRole = 'employee' | 'industry';

export interface Organization {
  id: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface Employee {
  id: string;
  org_id: string;
  employee_code: string;
  password_hash?: string;
  full_name: string;
  designation: string;
  department: string;
  experience_years: number;
  phone: string;
  email: string;
  joined_on: string;
  bio: string;
  avatar_url: string;
  created_at: string;
}

export interface Machine {
  id: string;
  org_id: string;
  name: string;
  category: string;
  description: string;
  image_url: string;
  specifications: string;
  common_issues: string;
  safety_notes: string;
  updated_at: string;
}

export type EntryStatus = 'pending' | 'approved' | 'rejected';

export interface Entry {
  id: string;
  org_id: string;
  employee_id: string | null;
  machine_id: string | null;
  title: string;
  content_html: string;
  content_text: string;
  tags: string[];
  is_safety_critical: boolean;
  status: EntryStatus;
  rejection_reason: string | null;
  author_name_cache: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  
  // Joined fields for display
  employee?: {
    id: string;
    full_name: string;
    designation: string;
    avatar_url: string;
  } | null;
  machine?: {
    id: string;
    name: string;
    category: string;
    safety_notes?: string;
  } | null;
}

export interface UnansweredQuestion {
  id: string;
  org_id: string;
  question: string;
  asked_by: string;
  created_at: string;
}

export interface SessionPayload {
  role: UserRole;
  orgId: string;
  orgName: string;
  employeeId?: string;
  employeeCode?: string;
  name: string;
  avatarUrl?: string;
  email?: string;
}
