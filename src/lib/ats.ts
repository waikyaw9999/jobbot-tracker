import { slugifyToken } from "@/lib/constants";

/**
 * ATS here means the applicant-tracking *vendor* the role was submitted through
 * (Greenhouse, Workday, …) — separate from the job-board / market *source*
 * (LinkedIn, Seek, Bayt, …). No vendor APIs are called; this is local tagging.
 */
export const ATS_VENDORS = [
  {
    value: "unknown",
    label: "Unknown",
    regions: ["global"],
    group: "special",
    hosts: [] as string[],
  },
  {
    value: "other",
    label: "Other",
    regions: ["global"],
    group: "special",
    hosts: [],
  },
  {
    value: "career_site",
    label: "Company career site (non-ATS)",
    regions: ["global"],
    group: "special",
    hosts: [],
  },
  {
    value: "email_referral",
    label: "Email/referral (no ATS)",
    regions: ["global"],
    group: "special",
    hosts: [],
  },
  {
    value: "greenhouse",
    label: "Greenhouse",
    regions: ["us", "eu", "uk", "remote"],
    group: "popular",
    hosts: ["greenhouse.io"],
  },
  {
    value: "lever",
    label: "Lever",
    regions: ["us", "eu", "remote"],
    group: "popular",
    hosts: ["lever.co"],
  },
  {
    value: "ashby",
    label: "Ashby",
    regions: ["us", "eu", "remote"],
    group: "popular",
    hosts: ["ashbyhq.com"],
  },
  {
    value: "smartrecruiters",
    label: "SmartRecruiters",
    regions: ["us", "eu", "uk"],
    group: "popular",
    hosts: ["smartrecruiters.com"],
  },
  {
    value: "workable",
    label: "Workable",
    regions: ["us", "eu", "uk", "remote"],
    group: "popular",
    hosts: ["workable.com"],
  },
  {
    value: "workday",
    label: "Workday",
    regions: ["us", "eu", "uk", "apac", "mena", "remote"],
    group: "enterprise",
    hosts: ["myworkdayjobs.com"],
  },
  {
    value: "taleo",
    label: "Oracle Taleo",
    regions: ["us", "eu", "uk", "mena"],
    group: "enterprise",
    hosts: ["taleo.net"],
  },
  {
    value: "oracle_hcm",
    label: "Oracle Recruiting Cloud",
    regions: ["us", "eu", "apac", "mena"],
    group: "enterprise",
    hosts: ["fa.ocs.oraclecloud.com"],
  },
  {
    value: "icims",
    label: "iCIMS",
    regions: ["us", "eu", "uk"],
    group: "enterprise",
    hosts: ["icims.com"],
  },
  {
    value: "successfactors",
    label: "SAP SuccessFactors",
    regions: ["eu", "us", "uk", "apac"],
    group: "enterprise",
    hosts: ["successfactors.com", "successfactors.eu", "sapsf.com", "sapsf.eu"],
  },
  {
    value: "jobvite",
    label: "Jobvite",
    regions: ["us"],
    group: "enterprise",
    hosts: ["jobvite.com"],
  },
  {
    value: "ukg",
    label: "UKG / UltiPro",
    regions: ["us"],
    group: "enterprise",
    hosts: ["ultipro.com", "ukg.net", "ukg.com"],
  },
  {
    value: "adp",
    label: "ADP Recruiting",
    regions: ["us"],
    group: "enterprise",
    hosts: ["myjobs.adp.com", "workforcenow.adp.com", "recruiting.adp.com"],
  },
  {
    value: "phenom",
    label: "Phenom",
    regions: ["us", "eu"],
    group: "enterprise",
    hosts: ["phenom.com", "phenompeople.com", "phenompro.com"],
  },
  {
    value: "eightfold",
    label: "Eightfold",
    regions: ["us", "eu", "apac"],
    group: "enterprise",
    hosts: ["eightfold.ai"],
  },
  {
    value: "avature",
    label: "Avature",
    regions: ["us", "eu", "uk", "apac"],
    group: "enterprise",
    hosts: ["avature.net"],
  },
  {
    value: "cornerstone",
    label: "Cornerstone",
    regions: ["us", "eu"],
    group: "enterprise",
    hosts: ["csod.com", "cornerstoneondemand.com"],
  },
  {
    value: "bamboohr",
    label: "BambooHR",
    regions: ["us", "eu", "remote"],
    group: "hr_suites",
    hosts: ["bamboohr.com"],
  },
  {
    value: "rippling",
    label: "Rippling",
    regions: ["us", "remote"],
    group: "hr_suites",
    hosts: ["rippling.com"],
  },
  {
    value: "jazzhr",
    label: "JazzHR",
    regions: ["us"],
    group: "hr_suites",
    hosts: ["jazzhr.com", "applytojob.com"],
  },
  {
    value: "breezy",
    label: "Breezy HR",
    regions: ["us", "remote"],
    group: "hr_suites",
    hosts: ["breezy.hr"],
  },
  {
    value: "freshteam",
    label: "Freshteam",
    regions: ["us", "apac"],
    group: "hr_suites",
    hosts: ["freshteam.com"],
  },
  {
    value: "zoho_recruit",
    label: "Zoho Recruit",
    regions: ["us", "apac", "mena"],
    group: "hr_suites",
    hosts: ["zohorecruit.com", "recruit.zoho.com", "recruit.zoho.eu"],
  },
  {
    value: "personio",
    label: "Personio",
    regions: ["eu", "uk"],
    group: "europe",
    hosts: ["personio.com", "personio.de", "jobs.personio.de", "jobs.personio.com"],
  },
  {
    value: "teamtailor",
    label: "Teamtailor",
    regions: ["eu", "uk"],
    group: "europe",
    hosts: ["teamtailor.com"],
  },
  {
    value: "recruitee",
    label: "Recruitee",
    regions: ["eu", "uk"],
    group: "europe",
    hosts: ["recruitee.com"],
  },
  {
    value: "join",
    label: "JOIN",
    regions: ["eu"],
    group: "europe",
    hosts: ["join.com"],
  },
  {
    value: "homerun",
    label: "Homerun",
    regions: ["eu"],
    group: "europe",
    hosts: ["homerun.co"],
  },
  {
    value: "softgarden",
    label: "softgarden",
    regions: ["eu"],
    group: "europe",
    hosts: ["softgarden.io", "softgarden.com", "softgarden.de"],
  },
  {
    value: "onlyfy",
    label: "Onlyfy (Xing)",
    regions: ["eu"],
    group: "europe",
    hosts: ["onlyfy.io", "onlyfy.com"],
  },
  {
    value: "applied",
    label: "Applied",
    regions: ["uk", "eu"],
    group: "europe",
    hosts: ["beapplied.com"],
  },
  {
    value: "tribepad",
    label: "Tribepad",
    regions: ["uk"],
    group: "europe",
    hosts: ["tribepad.com"],
  },
  {
    value: "jobylon",
    label: "Jobylon",
    regions: ["eu"],
    group: "europe",
    hosts: ["jobylon.com"],
  },
  {
    value: "pageup",
    label: "PageUp",
    regions: ["apac"],
    group: "apac_mena",
    hosts: ["pageuppeople.com", "pageup.com.au"],
  },
  {
    value: "jobadder",
    label: "JobAdder",
    regions: ["apac"],
    group: "apac_mena",
    hosts: ["jobadder.com"],
  },
  {
    value: "manatal",
    label: "Manatal",
    regions: ["apac", "mena"],
    group: "apac_mena",
    hosts: ["manatal.com"],
  },
  {
    value: "talentera",
    label: "Talentera",
    regions: ["mena"],
    group: "apac_mena",
    hosts: ["talentera.com"],
  },
  {
    value: "pinpoint",
    label: "Pinpoint",
    regions: ["us", "uk", "remote"],
    group: "startup",
    hosts: ["pinpoint.tech", "pinpointhq.com"],
  },
  {
    value: "dover",
    label: "Dover",
    regions: ["us", "remote"],
    group: "startup",
    hosts: ["dover.com", "dover.io"],
  },
  {
    value: "gem",
    label: "Gem",
    regions: ["us", "remote"],
    group: "startup",
    hosts: ["gem.com"],
  },
  {
    value: "comeet",
    label: "Comeet",
    regions: ["us", "eu"],
    group: "startup",
    hosts: ["comeet.co", "comeet.com"],
  },
  {
    value: "fountain",
    label: "Fountain",
    regions: ["us"],
    group: "startup",
    hosts: ["fountain.com"],
  },
] as const;

export type AtsVendor = (typeof ATS_VENDORS)[number]["value"];

export const ATS_GROUP_LABELS: Record<(typeof ATS_VENDORS)[number]["group"], string> = {
  special: "General",
  popular: "Popular boards",
  enterprise: "Enterprise HCM",
  hr_suites: "HR suites",
  europe: "Europe & UK",
  apac_mena: "APAC & MENA",
  startup: "Startup / recruiting tools",
};

export const ATS_GROUPS = (Object.keys(ATS_GROUP_LABELS) as (typeof ATS_VENDORS)[number]["group"][]).map(
  (group) => ({
    group,
    label: ATS_GROUP_LABELS[group],
    items: ATS_VENDORS.filter((v) => v.group === group),
  })
);

export const ATS_VALUES = ATS_VENDORS.map((v) => v.value) as AtsVendor[];

const ATS_ALIASES: Record<string, AtsVendor> = {
  sap: "successfactors",
  sap_successfactors: "successfactors",
  success_factors: "successfactors",
  oracle_taleo: "taleo",
  taleo_oracle: "taleo",
  oracle: "oracle_hcm",
  recruiting_cloud: "oracle_hcm",
  company_career_site: "career_site",
  company_site: "career_site",
  career: "career_site",
  non_ats: "career_site",
  email: "email_referral",
  referral: "email_referral",
  no_ats: "email_referral",
  ukg_pro: "ukg",
  ultipro: "ukg",
  zoho: "zoho_recruit",
  join_com: "join",
  xing: "onlyfy",
  breezy_hr: "breezy",
  bamboo: "bamboohr",
  bamboo_hr: "bamboohr",
  jazz: "jazzhr",
  jazz_hr: "jazzhr",
};

const PLATFORM_ATS_HINTS: Record<string, AtsVendor> = {
  greenhouse: "greenhouse",
  lever: "lever",
  email: "email_referral",
  referral: "email_referral",
  company_site: "career_site",
};

export function isAts(value: string): value is AtsVendor {
  return ATS_VALUES.includes(value as AtsVendor);
}

export function atsLabel(value: string | null | undefined) {
  if (!value) return ATS_VENDORS[0].label;
  return ATS_VENDORS.find((v) => v.value === value)?.label ?? value;
}

export function resolveAts(value: string | null | undefined): AtsVendor {
  return parseAts(value) ?? "unknown";
}

export function parseAts(value: string | null | undefined): AtsVendor | null {
  const slug = slugifyToken(value);
  if (!slug) return null;
  if (isAts(slug)) return slug;
  const aliased = ATS_ALIASES[slug] ?? ATS_ALIASES[slug.replaceAll("_", "")];
  if (aliased && isAts(aliased)) return aliased;
  const byLabel = ATS_VENDORS.find((v) => slugifyToken(v.label) === slug);
  return byLabel?.value ?? null;
}

export function atsFromPlatform(platform: string | null | undefined): AtsVendor | null {
  if (!platform) return null;
  return PLATFORM_ATS_HINTS[platform] ?? null;
}

export function hostMatches(hostname: string, pattern: string) {
  const host = hostname.replace(/^www\./, "").toLowerCase();
  const needle = pattern.toLowerCase();
  return host === needle || host.endsWith(`.${needle}`);
}

export function detectAtsFromUrl(url?: string | null): AtsVendor | null {
  const hostname = hostnameFromUrl(url);
  if (!hostname) return null;
  for (const vendor of ATS_VENDORS) {
    if (vendor.hosts.some((pattern) => hostMatches(hostname, pattern))) {
      return vendor.value;
    }
  }
  return null;
}

export function hostnameFromUrl(url?: string | null) {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.includes("://") ? url : `https://${url.trim()}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isAtsPortalUrl(url?: string | null) {
  return detectAtsFromUrl(url) != null;
}

export function regionSummary(regions: readonly string[]) {
  const labels: Record<string, string> = {
    global: "Global",
    us: "US",
    eu: "EU",
    uk: "UK",
    apac: "APAC",
    mena: "MENA",
    remote: "Remote",
  };
  return regions.map((r) => labels[r] ?? r).join(" · ");
}
