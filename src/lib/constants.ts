export const PLATFORMS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "indeed", label: "Indeed" },
  { value: "glassdoor", label: "Glassdoor" },
  { value: "wellfound", label: "Wellfound" },
  { value: "handshake", label: "Handshake" },
  { value: "greenhouse", label: "Greenhouse" },
  { value: "lever", label: "Lever" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
] as const;

export type Platform = (typeof PLATFORMS)[number]["value"];

export const STATUSES = [
  { value: "saved", label: "Saved", tone: "muted" },
  { value: "applied", label: "Applied", tone: "info" },
  { value: "recruiter_screen", label: "Recruiter screen", tone: "info" },
  { value: "hiring_manager", label: "Hiring manager", tone: "warn" },
  { value: "interview", label: "Interview", tone: "warn" },
  { value: "offer", label: "Offer", tone: "success" },
  { value: "accepted", label: "Accepted", tone: "success" },
  { value: "rejected", label: "Rejected", tone: "danger" },
  { value: "withdrawn", label: "Withdrawn", tone: "muted" },
  { value: "ghosted", label: "Ghosted", tone: "danger" },
] as const;

export type Status = (typeof STATUSES)[number]["value"];

export const PIPELINE_STATUSES: Status[] = [
  "saved",
  "applied",
  "recruiter_screen",
  "hiring_manager",
  "interview",
  "offer",
];

export const TERMINAL_STATUSES: Status[] = [
  "accepted",
  "rejected",
  "withdrawn",
  "ghosted",
];

export const STATUS_VALUES = STATUSES.map((s) => s.value) as Status[];
export const PLATFORM_VALUES = PLATFORMS.map((p) => p.value) as Platform[];

export function platformLabel(value: string) {
  return PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

export function statusLabel(value: string) {
  return STATUSES.find((s) => s.value === value)?.label ?? value;
}

export function isStatus(value: string): value is Status {
  return STATUS_VALUES.includes(value as Status);
}

export function isPlatform(value: string): value is Platform {
  return PLATFORM_VALUES.includes(value as Platform);
}

export function isTerminal(status: Status) {
  return TERMINAL_STATUSES.includes(status);
}
