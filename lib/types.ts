export type UserRole = 'employee' | 'industry';

export interface Organization {
  id: string;
  name: string;
  password_hash: string;
  created_at: string;
  logo_url?: string | null;
  org_code?: string | null;
  contact_phone?: string | null;
  org_email?: string | null;
  industry_type?: string | null;
  description?: string | null;
  admin_name?: string | null;
  address?: string | null;
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
  is_senior?: boolean;
  status?: 'active' | 'suspended';
}

export type MachineStatus = 'active' | 'inactive' | 'under_maintenance' | 'retired';

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
  status?: MachineStatus;
  department?: string | null;
  gallery?: string[];
}

export type EntryStatus = 'pending' | 'approved' | 'rejected';

export interface EntryAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

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
  thumbnail_url?: string | null;
  attachments?: EntryAttachment[];
  
  // Joined fields for display
  employee?: {
    id: string;
    full_name: string;
    designation: string;
    avatar_url: string;
    is_senior?: boolean;
  } | null;
  machine?: {
    id: string;
    name: string;
    category: string;
    safety_notes?: string;
    status?: MachineStatus;
    department?: string | null;
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
