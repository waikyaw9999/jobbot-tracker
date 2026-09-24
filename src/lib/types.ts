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

export type OpportunityStatus =
  | "new"
  | "worth_a_look"
  | "draft_ready"
  | "portal_only"
  | "promoted"
  | "skipped"
  | "closed";

export type MarketCode = "SG" | "TH" | "AU" | "OTHER";
export type Sponsorship = "yes" | "no" | "unknown";
export type ContactChannel = "email" | "portal" | "line" | "linkedin";

export type Opportunity = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  market: string | null;
  seniority: string | null;
  tech_tags: string | null;
  source: Platform;
  job_url: string | null;
  url_key: string | null;
  company_title_key: string;
  ats: AtsVendor | null;
  visa_note: string | null;
  sponsorship: string | null;
  nationality_constraint: string | null;
  fit: string | null;
  fit_score: number | null;
  fit_reason: string | null;
  status: OpportunityStatus;
  skip_reason: string | null;
  posted_at: string | null;
  discovered_at: string;
  notes: string | null;
  cover_letter: string | null;
  application_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OpportunityContact = {
  opportunity_id: string;
  email: string | null;
  channel: string;
  verified: number;
  verification_note: string | null;
  updated_at: string;
};

export type OpportunityDraft = {
  id: string;
  opportunity_id: string;
  to_address: string | null;
  subject: string | null;
  body: string;
  created_at: string;
};

export type OpportunityEvent = {
  id: string;
  opportunity_id: string | null;
  type: string;
  message: string;
  created_at: string;
};

export type SearchPreferences = {
  id: string;
  include_titles: string;
  exclude_keywords: string;
  markets: string;
  market_codes: string;
  min_seniority: string;
  require_sponsorship_au: number;
  never_invent_email: number;
  sources: string;
  stack_keywords: string;
  notes: string;
  updated_at: string;
};

export type OpportunityCounts = {
  total: number;
  new: number;
  worth_a_look: number;
  draft_ready: number;
  portal_only: number;
  skipped: number;
  promoted: number;
  closed: number;
};

export type DuplicateMatch = {
  kind: "opportunity" | "application";
  id: string;
  title: string;
  company: string;
  href: string;
  reason: "url" | "company_title";
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
