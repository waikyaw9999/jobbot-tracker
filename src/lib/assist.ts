import { detectAtsFromUrl, hostnameFromUrl, type AtsVendor } from "@/lib/ats";
import {
  isPlatform,
  parsePlatform,
  slugifyToken,
  type Platform,
} from "@/lib/constants";
import type { OpportunityStatus } from "@/lib/types";

export const OPPORTUNITY_STATUSES = [
  { value: "new", label: "New", tone: "info" },
  { value: "worth_a_look", label: "Worth a look", tone: "warn" },
  { value: "draft_ready", label: "Draft ready", tone: "success" },
  { value: "skipped", label: "Skipped", tone: "muted" },
  { value: "promoted", label: "Promoted", tone: "info" },
] as const satisfies readonly {
  value: OpportunityStatus;
  label: string;
  tone: string;
}[];

export const FIT_LABELS = ["Excellent", "Strong", "Good", "Stretch"] as const;
export type FitLabel = (typeof FIT_LABELS)[number];

export const ASSIST_SOURCES = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "jobstreet", label: "JobStreet" },
  { value: "jobsdb", label: "JobsDB" },
  { value: "indeed", label: "Indeed" },
  { value: "jaabz", label: "Jaabz" },
  { value: "ashby", label: "Ashby" },
  { value: "michael_page", label: "Michael Page" },
  { value: "other", label: "Other" },
] as const satisfies readonly { value: Platform; label: string }[];

export type DigestStatus = "applied" | Exclude<OpportunityStatus, "promoted">;

export type DigestRow = {
  digestStatus: DigestStatus;
  title: string;
  company: string;
  location: string | null;
  source: Platform;
  visaNote: string | null;
  fit: string | null;
  jobUrl: string | null;
  coverLetter: string | null;
  notes: string | null;
  discoveredAt: string | null;
};

export type DigestParseResult = {
  rows: DigestRow[];
  errors: string[];
};

export const DEFAULT_SEARCH_PREFERENCES = {
  include_titles: [
    "Senior Full Stack",
    "Tech Lead",
    "Staff Engineer",
    "Engineering Manager",
    "Full Stack Engineer",
    "Software Architect",
  ].join("\n"),
  exclude_keywords: ["intern", "junior", "unpaid", "graduate", "fresh graduate"].join("\n"),
  markets: ["Singapore", "Thailand / Bangkok", "Australia (visa sponsor preferred)"].join("\n"),
  sources: ASSIST_SOURCES.map((source) => source.value) as Platform[],
  stack_keywords: [
    "Java",
    "Spring",
    "Python",
    ".NET",
    "C#",
    "React",
    "Next.js",
    "Node",
    "Nest",
    "Vue",
    "SQL",
    "Docker",
    "CI/CD",
    "AWS",
    "GCP",
  ].join("\n"),
  notes: [
    "Candidate: Wai Myo Kyaw — Senior Full Stack / Tech Lead, about 20 years.",
    "",
    "Cover letters: mention Java, Spring, and Python naturally in sentences. Do not bold stack keywords.",
    "Australia roles: note visa-sponsor interest (subclass 482) when the listing is open to sponsorship.",
    "Workflow: research and draft only. Confirm before any application is sent. Do not auto-apply and do not send email from this app.",
  ].join("\n"),
};

export const DIGEST_EXAMPLE = `## Draft ready

| Role | Company | Location | Source | Visa | Fit | URL |
| --- | --- | --- | --- | --- | --- | --- |
| Senior Full Stack Engineer | Northwind | Singapore | LinkedIn | — | Excellent | https://www.linkedin.com/jobs/view/1234567890 |

### Senior Full Stack Engineer — Northwind

Dear hiring team, I have spent about twenty years building Java and Spring services, with Python and React beside them.

## Worth a look

| Role | Company | Location | Source | Visa | Fit | URL |
| --- | --- | --- | --- | --- | --- | --- |
| Tech Lead | Contoso | Sydney | Jaabz | 482 sponsor | Strong | https://jaabz.com/jobs/482-tech-lead |
`;

const HOST_SOURCES: { includes: string; source: Platform }[] = [
  { includes: "linkedin.", source: "linkedin" },
  { includes: "jobstreet.", source: "jobstreet" },
  { includes: "jobsdb.", source: "jobsdb" },
  { includes: "indeed.", source: "indeed" },
  { includes: "jaabz.", source: "jaabz" },
  { includes: "ashbyhq.", source: "ashby" },
  { includes: "michaelpage.", source: "michael_page" },
  { includes: "greenhouse.io", source: "greenhouse" },
  { includes: "lever.co", source: "lever" },
];

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gh_src",
  "trk",
  "trackingid",
  "tracking_id",
  "refid",
  "ref",
  "source",
  "lipi",
  "originalsubdomain",
  "position",
  "pagenum",
  "trkemail",
]);

const KEYWORD_SYNONYMS: Record<string, string[]> = {
  "c#": ["c#", "c sharp", "csharp"],
  csharp: ["c#", "c sharp", "csharp"],
  ".net": [".net", "dotnet", "asp.net"],
  dotnet: [".net", "dotnet", "asp.net"],
  "next.js": ["next.js", "nextjs", "next js"],
  nextjs: ["next.js", "nextjs", "next js"],
  next: ["next.js", "nextjs", "next js", "next"],
  node: ["node", "node.js", "nodejs"],
  "node.js": ["node", "node.js", "nodejs"],
  nodejs: ["node", "node.js", "nodejs"],
  nest: ["nest", "nestjs", "nest.js"],
  nestjs: ["nest", "nestjs", "nest.js"],
  "ci/cd": ["ci/cd", "cicd", "ci cd"],
  cicd: ["ci/cd", "cicd", "ci cd"],
  react: ["react", "react.js", "reactjs"],
  vue: ["vue", "vue.js", "vuejs"],
};

type DigestField =
  | "status"
  | "title"
  | "company"
  | "location"
  | "source"
  | "visa"
  | "fit"
  | "url"
  | "cover"
  | "notes"
  | "date";

const HEADER_MAP: Record<string, DigestField> = {
  status: "status",
  state: "status",
  role: "title",
  title: "title",
  position: "title",
  job: "title",
  job_title: "title",
  company: "company",
  organisation: "company",
  organization: "company",
  employer: "company",
  location: "location",
  loc: "location",
  market: "location",
  city: "location",
  source: "source",
  board: "source",
  platform: "source",
  visa: "visa",
  visa_note: "visa",
  visa_sponsor: "visa",
  sponsor: "visa",
  sponsorship: "visa",
  fit: "fit",
  match: "fit",
  url: "url",
  link: "url",
  job_url: "url",
  job_link: "url",
  href: "url",
  cover_letter: "cover",
  coverletter: "cover",
  cover: "cover",
  letter: "cover",
  draft: "cover",
  joburl: "url",
  jobtitle: "title",
  visanote: "visa",
  notes: "notes",
  note: "notes",
  comment: "notes",
  discovered: "date",
  discovered_at: "date",
  date: "date",
};

export function isOpportunityStatus(value: string): value is OpportunityStatus {
  return OPPORTUNITY_STATUSES.some((status) => status.value === value);
}

export function opportunityStatusLabel(value: string) {
  return OPPORTUNITY_STATUSES.find((status) => status.value === value)?.label ?? value;
}

export function opportunityStatusTone(value: string) {
  return OPPORTUNITY_STATUSES.find((status) => status.value === value)?.tone ?? "muted";
}

export function textLines(value: string | null | undefined) {
  return (value ?? "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseSourceList(raw: string | null | undefined): Platform[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is Platform => typeof value === "string" && isPlatform(value));
  } catch {
    return [];
  }
}

export function marketChips(markets: string | null | undefined) {
  const chips: { label: string; query: string }[] = [];
  const seen = new Set<string>();
  for (const line of textLines(markets)) {
    const parts = line
      .split(/[/|]| and /i)
      .map((part) => part.replace(/\(.*?\)/g, "").trim())
      .filter(Boolean);
    for (const part of parts) {
      const key = part.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      chips.push({ label: part, query: part });
    }
  }
  return chips;
}

export function normToken(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function companyTitleKey(company: string, title: string) {
  return `${normToken(company)}|${normToken(title)}`;
}

export function urlKeyOf(url: string | null | undefined) {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  if (!host || !host.includes(".")) return null;

  if (host.endsWith("linkedin.com")) {
    const fromQuery = parsed.searchParams.get("currentJobId");
    const fromPath = parsed.pathname.match(/\/jobs\/view\/(?:.*-)?(\d{6,})/);
    const id = fromQuery || fromPath?.[1];
    if (id) return `linkedin:job:${id}`;
  }

  if (host.includes("indeed.")) {
    const jk = parsed.searchParams.get("jk");
    if (jk) return `indeed:jk:${jk.toLowerCase()}`;
  }

  const kept = [...parsed.searchParams.entries()].filter(([key]) => {
    const lower = key.toLowerCase();
    return !TRACKING_PARAMS.has(lower) && !lower.startsWith("utm_");
  });
  kept.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  const query = kept.length ? `?${new URLSearchParams(kept).toString()}` : "";
  return `${host}${path}${query}`.toLowerCase();
}

export function parseSource(value: string | null | undefined): Platform {
  const direct = parsePlatform(value);
  if (direct) return direct;
  const slug = slugifyToken(value);
  if (!slug) return "other";
  if (slug.includes("michael") && slug.includes("page")) return "michael_page";
  if (slug.includes("jaabz")) return "jaabz";
  if (slug.includes("ashby")) return "ashby";
  if (
    slug.includes("company") ||
    slug.includes("portal") ||
    slug.includes("career")
  ) {
    return "company_site";
  }
  for (const platform of ["jobstreet", "jobsdb", "linkedin", "indeed"] as const) {
    if (slug === platform || slug.startsWith(`${platform}_`)) return platform;
  }
  return "other";
}

export function hintsFromJobUrl(url: string | null | undefined): {
  source: Platform | null;
  ats: AtsVendor | null;
  companyHint: string | null;
} {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return { source: null, ats: null, companyHint: null };
  const host = hostnameFromUrl(trimmed);
  const ats = detectAtsFromUrl(trimmed);
  let source: Platform | null = null;
  if (host) {
    const hit = HOST_SOURCES.find((rule) => host.includes(rule.includes));
    if (hit) source = hit.source;
  }
  if (!source && ats && isPlatform(ats)) source = ats;
  if (!source && ats) source = "company_site";
  return { source, ats, companyHint: companyHintFromUrl(trimmed) };
}

export type FitResult = {
  label: FitLabel;
  score: number;
  reason: string;
  matchedTitles: string[];
  matchedStack: string[];
  excluded: string[];
};

export function scoreFit(
  input: {
    title: string;
    company?: string | null;
    location?: string | null;
    visaNote?: string | null;
    notes?: string | null;
  },
  prefs: {
    include_titles: string;
    exclude_keywords: string;
    stack_keywords: string;
  }
): FitResult {
  const title = input.title.trim();
  const haystack = [title, input.company, input.location, input.visaNote, input.notes]
    .filter(Boolean)
    .join("\n");
  const phrases = textLines(prefs.include_titles);
  const stackKeywords = splitKeywords(prefs.stack_keywords);
  const excludeKeywords = splitKeywords(prefs.exclude_keywords);

  const full = phrases.filter((phrase) => titleOverlap(title, phrase) === "full");
  const partial = phrases.filter((phrase) => titleOverlap(title, phrase) === "partial");
  const matchedStack = stackKeywords.filter((keyword) => containsKeyword(haystack, keyword));
  const excluded = excludeKeywords.filter(
    (keyword) => containsKeyword(title, keyword) || containsKeyword(haystack, keyword)
  );

  let label: FitLabel;
  if (excluded.length) label = "Stretch";
  else if ((full.length && matchedStack.length >= 3) || matchedStack.length >= 6) label = "Excellent";
  else if (
    (full.length && matchedStack.length >= 1) ||
    (partial.length && matchedStack.length >= 3) ||
    matchedStack.length >= 4
  ) {
    label = "Strong";
  } else if (full.length || partial.length || matchedStack.length >= 2) label = "Good";
  else label = "Stretch";

  const score = excluded.length
    ? Math.min(25, matchedStack.length * 5)
    : Math.min(100, full.length * 30 + partial.length * 15 + matchedStack.length * 8);

  const bits: string[] = [];
  if (full.length) bits.push(`title ${full.join(", ")}`);
  else if (partial.length) bits.push(`partial title ${partial.join(", ")}`);
  else bits.push("no title overlap");
  bits.push(matchedStack.length ? `stack ${matchedStack.join(", ")}` : "no stack overlap");
  if (excluded.length) bits.push(`excluded ${excluded.join(", ")}`);

  return {
    label,
    score,
    reason: `${label} · ${score} · ${bits.join(" · ")}`,
    matchedTitles: full.length ? full : partial,
    matchedStack,
    excluded,
  };
}

export function parseDigest(text: string): DigestParseResult {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return { rows: [], errors: ["Paste a digest or choose a file."] };
  const lines = trimmed.split(/\r?\n/);
  if (lines.some((line) => isTableLine(line))) return parseMarkdownDigest(lines);
  if (looksLikeCsv(trimmed)) return parseCsvDigest(trimmed);
  return {
    rows: [],
    errors: [
      "Could not find a markdown table or CSV header. Expected columns such as status, role, company, location, source, visa, fit, url.",
    ],
  };
}

export function parseDigestStatus(value: string | null | undefined): DigestStatus | null {
  if (!value) return null;
  const slug = value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (["applied", "submitted", "sent"].includes(slug)) return "applied";
  if (["draft ready", "draft", "drafted", "carried", "carried draft", "carry", "promoted"].includes(slug)) {
    return "draft_ready";
  }
  if (["worth a look", "worth looking", "maybe", "consider", "watch"].includes(slug)) {
    return "worth_a_look";
  }
  if (["skipped", "skip", "pass", "passed"].includes(slug)) return "skipped";
  if (slug === "new" || slug === "fresh") return "new";
  return null;
}

export function normalizeFit(value: string | null | undefined) {
  const raw = cleanPlain(value);
  if (!raw) return null;
  const slug = raw.toLowerCase();
  const mapped: Record<string, string> = {
    excellent: "Excellent",
    strong: "Strong",
    good: "Good",
    stretch: "Stretch",
    fair: "Fair",
    weak: "Weak",
  };
  return mapped[slug] ?? raw;
}

export function normalizeDate(value: string | null | undefined) {
  const raw = cleanPlain(value);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function splitKeywords(value: string) {
  const seen = new Set<string>();
  const keywords: string[] = [];
  for (const part of value.split(/[\n,]/)) {
    const keyword = part.trim();
    const key = keyword.toLowerCase();
    if (!keyword || seen.has(key)) continue;
    seen.add(key);
    keywords.push(keyword);
  }
  return keywords;
}

function titleOverlap(title: string, phrase: string): "full" | "partial" | null {
  const left = normToken(title);
  const right = normToken(phrase);
  if (!left || !right) return null;
  if (left.includes(right) || right.includes(left)) return "full";
  const stop = new Set(["a", "an", "the", "of", "and", "for"]);
  const phraseTokens = right.split(" ").filter((token) => !stop.has(token));
  if (!phraseTokens.length) return null;
  const titleTokens = new Set(left.split(" "));
  const hits = phraseTokens.filter((token) => titleTokens.has(token)).length;
  if (hits >= Math.min(2, phraseTokens.length) && hits / phraseTokens.length >= 0.6) return "partial";
  return null;
}

function containsKeyword(haystack: string, keyword: string) {
  const variants = expandKeyword(keyword);
  const padded = ` ${haystack.toLowerCase()} `;
  return variants.some((variant) => {
    const needle = variant.toLowerCase();
    if (!needle) return false;
    if (/^[a-z0-9]+$/i.test(needle)) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(padded);
    }
    return padded.includes(needle);
  });
}

function expandKeyword(keyword: string) {
  const key = keyword.trim().toLowerCase();
  return KEYWORD_SYNONYMS[key] ?? [keyword.trim()];
}

function companyHintFromUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url.includes("://") ? url : `https://${url}`);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const parts = parsed.pathname.split("/").filter(Boolean);
  let slug: string | null = null;
  if (host.endsWith("ashbyhq.com") || host.endsWith("lever.co")) slug = parts[0] ?? null;
  else if (host.includes("greenhouse.io")) slug = parts[0] && parts[0] !== "embed" ? parts[0] : null;
  else if (host.includes("myworkdayjobs.com")) {
    const sub = host.split(".")[0];
    if (sub && sub !== "www" && !/^wd\d+$/.test(sub)) slug = sub;
    else slug = parts[0] ?? null;
  }
  if (!slug) return null;
  try {
    slug = decodeURIComponent(slug);
  } catch {
    return null;
  }
  if (looksLikeId(slug)) return null;
  return titleCaseSlug(slug);
}

function looksLikeId(value: string) {
  return /^[0-9a-f-]{16,}$/i.test(value) || /^\d{5,}$/.test(value);
}

function titleCaseSlug(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseMarkdownDigest(lines: string[]): DigestParseResult {
  const rows: DigestRow[] = [];
  const errors: string[] = [];
  const letters: LetterBlock[] = [];
  let sectionStatus: DigestStatus | null = null;
  let letter: LetterBlock | null = null;
  let lineNumber = 0;

  const flushLetter = () => {
    if (!letter) return;
    const body = letter.body.trim();
    if (body) letters.push({ ...letter, body });
    letter = null;
  };

  while (lineNumber < lines.length) {
    const raw = lines[lineNumber];
    const trimmed = raw.trim();

    if (trimmed.startsWith("#")) {
      flushLetter();
      const heading = trimmed.replace(/^#+\s*/, "").trim();
      const asLetter = parseLetterHeading(heading);
      if (asLetter) {
        letter = { ...asLetter, body: "", afterIndex: rows.length - 1 };
        lineNumber += 1;
        continue;
      }
      const status = statusFromHeading(heading);
      if (status) sectionStatus = status;
      lineNumber += 1;
      continue;
    }

    if (letter && !isTableLine(trimmed)) {
      letter.body += `${raw}\n`;
      lineNumber += 1;
      continue;
    }

    if (isTableLine(trimmed)) {
      flushLetter();
      const block: string[] = [];
      const start = lineNumber + 1;
      while (lineNumber < lines.length && isTableLine(lines[lineNumber].trim())) {
        block.push(lines[lineNumber]);
        lineNumber += 1;
      }
      const parsed = rowsFromMatrix(tableMatrix(block), sectionStatus, start);
      rows.push(...parsed.rows);
      errors.push(...parsed.errors);
      continue;
    }

    lineNumber += 1;
  }

  flushLetter();
  applyLetters(rows, letters);
  if (!rows.length && !errors.length) {
    errors.push("No opportunity rows found in the markdown tables.");
  }
  return { rows, errors };
}

function parseCsvDigest(text: string): DigestParseResult {
  const matrix = parseCsv(text);
  if (!matrix.length) return { rows: [], errors: ["CSV was empty."] };
  const headerKeys = matrix[0].map(headerKey);
  const known = headerKeys.filter((key) => HEADER_MAP[key]).length;
  if (known >= 2) {
    return rowsFromMatrix(
      matrix.slice(1),
      null,
      2,
      headerKeys.map((key) => HEADER_MAP[key] ?? null)
    );
  }
  return rowsFromMatrix(matrix, null, 1, inferFields(matrix[0]));
}

function looksLikeCsv(text: string) {
  const line = text.split(/\r?\n/).find((entry) => entry.trim());
  if (!line || !line.includes(",")) return false;
  return splitCsvLine(line).map(headerKey).some((key) => HEADER_MAP[key]);
}

function rowsFromMatrix(
  matrix: string[][],
  sectionStatus: DigestStatus | null,
  startLine: number,
  fields?: (DigestField | null)[]
): DigestParseResult {
  const rows: DigestRow[] = [];
  const errors: string[] = [];
  const resolvedFields = fields ?? inferFields(matrix[0] ?? []);
  const data = fields ? matrix : matrix;
  const useInferredHeader = !fields && isHeaderRow(matrix[0] ?? []);
  const body = useInferredHeader ? matrix.slice(1) : data;
  const bodyFields = useInferredHeader
    ? (matrix[0] ?? []).map((cell) => HEADER_MAP[headerKey(cell)] ?? null)
    : resolvedFields;
  const firstLine = useInferredHeader ? startLine + 1 : startLine;

  body.forEach((cells, index) => {
    if (cells.every((cell) => !cell.trim())) return;
    const record: Partial<Record<DigestField, string>> = {};
    bodyFields.forEach((field, cellIndex) => {
      if (!field) return;
      record[field] = cells[cellIndex] ?? "";
    });
    const built = buildDigestRow(record, sectionStatus);
    if (built.ok) rows.push(built.row);
    else errors.push(`Row ${firstLine + index}: ${built.error}`);
  });

  if (!rows.length && !errors.length) errors.push("No opportunity rows found.");
  return { rows, errors };
}

function tableMatrix(block: string[]) {
  return block
    .filter((line) => !isSeparatorLine(line))
    .map(splitMarkdownRow);
}

function isHeaderRow(cells: string[]) {
  const known = cells.map(headerKey).filter((key) => HEADER_MAP[key]).length;
  return known >= 2;
}

function inferFields(cells: string[]): (DigestField | null)[] {
  if (isHeaderRow(cells)) return cells.map((cell) => HEADER_MAP[headerKey(cell)] ?? null);
  const first = cleanPlain(cells[0])?.toLowerCase() ?? "";
  const statusLike = /applied|draft|worth|skip|new|carried/.test(first);
  const base: DigestField[] = statusLike
    ? ["status", "title", "company", "location", "source", "visa", "fit", "url", "cover"]
    : ["title", "company", "location", "source", "visa", "fit", "url", "cover"];
  return base.slice(0, Math.max(cells.length, 1));
}

function buildDigestRow(
  record: Partial<Record<DigestField, string>>,
  sectionStatus: DigestStatus | null
): { ok: true; row: DigestRow } | { ok: false; error: string } {
  const titleBits = markdownTextAndUrl(record.title ?? "");
  const company = cleanPlain(markdownTextAndUrl(record.company ?? "").text);
  const title = cleanPlain(titleBits.text);
  if (!title || !company) return { ok: false, error: "missing role or company" };
  const fromCell = parseDigestStatus(cleanPlain(record.status));
  const digestStatus = fromCell ?? sectionStatus ?? "new";
  const jobUrl = cleanUrl(record.url) ?? (titleBits.url ? cleanUrl(titleBits.url) : null);
  return {
    ok: true,
    row: {
      digestStatus,
      title,
      company,
      location: cleanPlain(record.location),
      source: parseSource(cleanPlain(record.source)),
      visaNote: cleanPlain(record.visa),
      fit: normalizeFit(record.fit),
      jobUrl,
      coverLetter: cleanLong(record.cover),
      notes: cleanLong(record.notes),
      discoveredAt: normalizeDate(record.date),
    },
  };
}

type LetterBlock = {
  role?: string;
  company?: string;
  anonymous?: boolean;
  body: string;
  afterIndex: number;
};

function parseLetterHeading(
  heading: string
): Pick<LetterBlock, "role" | "company" | "anonymous"> | null {
  const raw = heading.trim();
  if (/^cover letters?$/i.test(raw)) return { anonymous: true };
  const stripped = raw.replace(/^cover letters?\b\s*[:\-—–]?\s*/i, "").trim();
  const explicit = /^cover letters?\b/i.test(raw);
  const body = explicit ? stripped : raw;
  if (!body) return explicit ? { anonymous: true } : null;
  const splitters = [/\s+[—–]\s+/, /\s+-\s+/, /\s+@\s+/, /\s+at\s+/i];
  const canBeLetter = explicit || /[—–]/.test(raw) || /\s@\s/.test(raw) || /\s-\s/.test(raw) || /\sat\s/i.test(raw);
  if (!canBeLetter) return null;
  for (const splitter of splitters) {
    const parts = body.split(splitter);
    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
      return { role: cleanPlain(parts[0]) ?? parts[0].trim(), company: cleanPlain(parts[1]) ?? parts[1].trim() };
    }
  }
  return explicit ? { anonymous: true } : null;
}

function statusFromHeading(heading: string): DigestStatus | null {
  const slug = heading
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!slug || slug.length > 48) return null;
  if (/^carried\b/.test(slug) || /^draft\b/.test(slug) || slug.includes("draft ready")) return "draft_ready";
  if (/^worth\b/.test(slug) || slug.includes("worth a look")) return "worth_a_look";
  if (/^skip/.test(slug)) return "skipped";
  if (/^applied\b/.test(slug)) return "applied";
  if (/^new\b/.test(slug)) return "new";
  return null;
}

function applyLetters(rows: DigestRow[], letters: LetterBlock[]) {
  for (const letter of letters) {
    if (letter.anonymous || !letter.role || !letter.company) {
      const target = rows[letter.afterIndex];
      if (target && !target.coverLetter) target.coverLetter = letter.body;
      continue;
    }
    const keys = new Set([
      companyTitleKey(letter.company, letter.role),
      companyTitleKey(letter.role, letter.company),
    ]);
    const matches = rows.filter(
      (row) => keys.has(companyTitleKey(row.company, row.title)) && !row.coverLetter
    );
    if (matches.length) {
      for (const match of matches) match.coverLetter = letter.body;
      continue;
    }
    const fallback = rows[letter.afterIndex];
    if (fallback && !fallback.coverLetter) fallback.coverLetter = letter.body;
  }
}

function isTableLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return false;
  if (trimmed.startsWith("|")) return true;
  return trimmed.split("|").length - 1 >= 2;
}

function isSeparatorLine(line: string) {
  const cells = splitMarkdownRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

function splitMarkdownRow(line: string) {
  let value = line.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  return value.split("|").map((cell) => cell.trim());
}

function headerKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[*`]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function markdownTextAndUrl(cell: string) {
  const trimmed = cell.trim();
  const match = trimmed.match(/\[([^\]]+)\]\(([^)\s]+)\)/);
  if (!match) return { text: trimmed, url: null as string | null };
  return {
    text: trimmed.replace(/\[[^\]]+\]\([^)\s]+\)/g, match[1]).trim(),
    url: match[2].trim(),
  };
}

function cleanPlain(value: string | null | undefined) {
  if (!value) return null;
  const text = markdownTextAndUrl(value)
    .text.replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || text === "—" || text === "-" || text === "–" || /^n\/?a$/i.test(text)) return null;
  return text;
}

function cleanLong(value: string | null | undefined) {
  if (!value) return null;
  const text = value.replace(/<br\s*\/?>/gi, "\n").trim();
  if (!text || text === "—" || text === "-" || text === "–") return null;
  return text;
}

function cleanUrl(value: string | null | undefined) {
  const raw = markdownTextAndUrl(value ?? "").url ?? markdownTextAndUrl(value ?? "").text;
  const cleaned = raw.trim().replace(/^<|>$/g, "");
  if (!cleaned || cleaned === "—" || cleaned === "-" || /^n\/?a$/i.test(cleaned)) return null;
  if (/^https?:\/\//i.test(cleaned)) return cleaned;
  if (/^www\./i.test(cleaned) || /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(cleaned)) {
    return `https://${cleaned}`;
  }
  return null;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else quoted = false;
      } else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value.trim()));
}

function splitCsvLine(line: string) {
  return parseCsv(line)[0] ?? [];
}
