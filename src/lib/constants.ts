export const PLATFORMS = [
  { value: "linkedin", label: "LinkedIn", region: "global" },
  { value: "indeed", label: "Indeed", region: "global" },
  { value: "michael_page", label: "Michael Page", region: "global" },
  { value: "glassdoor", label: "Glassdoor", region: "us" },
  { value: "wellfound", label: "Wellfound", region: "remote" },
  { value: "handshake", label: "Handshake", region: "us" },
  { value: "ziprecruiter", label: "ZipRecruiter", region: "us" },
  { value: "monster", label: "Monster", region: "us" },
  { value: "dice", label: "Dice", region: "us" },
  { value: "builtin", label: "Built In", region: "us" },
  { value: "greenhouse", label: "Greenhouse", region: "direct" },
  { value: "lever", label: "Lever", region: "direct" },
  { value: "ashby", label: "Ashby", region: "direct" },
  { value: "stepstone", label: "StepStone", region: "eu" },
  { value: "reed", label: "Reed", region: "uk" },
  { value: "totaljobs", label: "Totaljobs", region: "uk" },
  { value: "cv_library", label: "CV-Library", region: "uk" },
  { value: "welcome_to_the_jungle", label: "Welcome to the Jungle", region: "eu" },
  { value: "xing", label: "Xing", region: "eu" },
  { value: "infojobs", label: "InfoJobs", region: "eu" },
  { value: "apec", label: "APEC", region: "eu" },
  { value: "hellowork", label: "Hellowork", region: "eu" },
  { value: "adzuna", label: "Adzuna", region: "eu" },
  { value: "otta", label: "Otta", region: "uk" },
  { value: "seek", label: "Seek", region: "apac" },
  { value: "jobsdb", label: "JobsDB", region: "apac" },
  { value: "jobstreet", label: "JobStreet", region: "apac" },
  { value: "jaabz", label: "Jaabz", region: "apac" },
  { value: "kalibrr", label: "Kalibrr", region: "apac" },
  { value: "naukri", label: "Naukri", region: "apac" },
  { value: "boss_zhipin", label: "Boss Zhipin", region: "apac" },
  { value: "fiftyone_job", label: "51Job", region: "apac" },
  { value: "liepin", label: "Liepin", region: "apac" },
  { value: "bayt", label: "Bayt", region: "mena" },
  { value: "naukrigulf", label: "Naukrigulf", region: "mena" },
  { value: "gulftalent", label: "GulfTalent", region: "mena" },
  { value: "wuzzuf", label: "Wuzzuf", region: "mena" },
  { value: "we_work_remotely", label: "We Work Remotely", region: "remote" },
  { value: "remote_ok", label: "Remote OK", region: "remote" },
  { value: "himalayas", label: "Himalayas", region: "remote" },
  { value: "flexjobs", label: "FlexJobs", region: "remote" },
  { value: "company_site", label: "Company career site", region: "direct" },
  { value: "email", label: "Email", region: "direct" },
  { value: "referral", label: "Referral", region: "direct" },
  { value: "other", label: "Other", region: "direct" },
] as const;

export type Platform = (typeof PLATFORMS)[number]["value"];

export const PLATFORM_REGION_LABELS: Record<
  (typeof PLATFORMS)[number]["region"],
  string
> = {
  global: "Global boards",
  us: "US & Canada",
  eu: "Europe",
  uk: "UK & Ireland",
  apac: "APAC",
  mena: "MENA",
  remote: "Remote-first",
  direct: "Direct / other",
};

export const PLATFORM_GROUPS = (
  Object.keys(PLATFORM_REGION_LABELS) as (typeof PLATFORMS)[number]["region"][]
).map((region) => ({
  region,
  label: PLATFORM_REGION_LABELS[region],
  items: PLATFORMS.filter((p) => p.region === region),
}));

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

const PLATFORM_ALIASES: Record<string, Platform> = {
  greenhouse_lever: "greenhouse",
  michaelpage: "michael_page",
  michaelpages: "michael_page",
  pagegroup: "michael_page",
  ashbyhq: "ashby",
  jobstreet_sg: "jobstreet",
  jobstreet_th: "jobstreet",
  jobsdb_sg: "jobsdb",
  jobsdb_th: "jobsdb",
  jobsdb_hk: "jobsdb",
  wttj: "welcome_to_the_jungle",
  welcome_to_the_jungle: "welcome_to_the_jungle",
  "51job": "fiftyone_job",
  "51_job": "fiftyone_job",
  fiftyonejob: "fiftyone_job",
  bosszhipin: "boss_zhipin",
  zhipin: "boss_zhipin",
  boss: "boss_zhipin",
  wwr: "we_work_remotely",
  weworkremotely: "we_work_remotely",
  remoteok: "remote_ok",
  cvlibrary: "cv_library",
  career_site: "company_site",
  careers: "company_site",
  company: "company_site",
  angellist: "wellfound",
  angel_list: "wellfound",
  angel: "wellfound",
};

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

export function parsePlatform(value: string | null | undefined): Platform | null {
  const slug = slugifyToken(value);
  if (!slug) return null;
  if (isPlatform(slug)) return slug;
  const aliased = PLATFORM_ALIASES[slug] ?? PLATFORM_ALIASES[slug.replaceAll("_", "")];
  return aliased && isPlatform(aliased) ? aliased : null;
}

export function isTerminal(status: Status) {
  return TERMINAL_STATUSES.includes(status);
}

export function slugifyToken(value: string | null | undefined) {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[/]+/g, "_")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
