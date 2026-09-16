import type { AtsVendor } from "@/lib/ats";
import type { Platform, Status } from "@/lib/constants";

export type Application = {
  id: string;
  company: string;
  role: string;
  platform: Platform;
  ats: AtsVendor | null;
  status: Status;
  location: string | null;
  job_url: string | null;
  salary_min: number | null;
  salary_max: number | null;
  notes: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  is_sample: number;
};

export type Contact = {
  id: string;
  application_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  notes: string | null;
  created_at: string;
};

export type FollowUp = {
  id: string;
  application_id: string;
  due_at: string;
  completed_at: string | null;
  note: string | null;
  created_at: string;
};

export type Activity = {
  id: string;
  application_id: string;
  type: string;
  message: string;
  created_at: string;
};

export type FollowUpWithApp = FollowUp & {
  company: string;
  role: string;
  status: Status;
};

export type ContactWithApp = Contact & {
  company: string;
  role: string;
};

export type ActivityWithApp = Activity & {
  company: string;
  role: string;
};

export type DashboardStats = {
  total: number;
  active: number;
  appliedThisWeek: number;
  overdueFollowUps: number;
  interviews: number;
  offers: number;
  sampleCount: number;
};

export type AtsCount = {
  ats: AtsVendor;
  count: number;
};

export type ApplicationInput = {
  company: string;
  role: string;
  platform: Platform;
  ats?: AtsVendor | null;
  status: Status;
  location?: string | null;
  job_url?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  notes?: string | null;
  applied_at?: string | null;
};
