import {
  atsFromPlatform,
  detectAtsFromUrl,
  parseAts,
  resolveAts,
  atsLabel,
} from "@/lib/ats";
import {
  isStatus,
  parsePlatform,
  platformLabel,
  statusLabel,
} from "@/lib/constants";
import type { Application, ApplicationInput } from "@/lib/types";

export const CSV_HEADERS = [
  "company",
  "role",
  "platform",
  "ats",
  "status",
  "location",
  "job_url",
  "salary_min",
  "salary_max",
  "notes",
  "applied_at",
] as const;

function escapeCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function applicationsToCsv(rows: Application[]) {
  const lines = [
    CSV_HEADERS.join(","),
    ...rows.map((row) =>
      [
        row.company,
        row.role,
        row.platform,
        row.ats || "unknown",
        row.status,
        row.location,
        row.job_url,
        row.salary_min,
        row.salary_max,
        row.notes,
        row.applied_at,
      ]
        .map(escapeCell)
        .join(",")
    ),
  ];
  return lines.join("\n") + "\n";
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c === "\r") {
      continue;
    } else {
      cell += c;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((value) => value.trim().length > 0));
}

function headerIndex(header: string[], ...names: string[]) {
  for (const name of names) {
    const i = header.indexOf(name);
    if (i >= 0) return i;
  }
  return -1;
}

export function csvToApplications(text: string): {
  rows: ApplicationInput[];
  errors: string[];
} {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], errors: ["CSV is empty"] };
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const index: Record<(typeof CSV_HEADERS)[number], number> = {
    company: headerIndex(header, "company"),
    role: headerIndex(header, "role"),
    platform: headerIndex(header, "platform", "source", "job_board"),
    ats: headerIndex(header, "ats", "ats_vendor"),
    status: headerIndex(header, "status"),
    location: headerIndex(header, "location"),
    job_url: headerIndex(header, "job_url", "url"),
    salary_min: headerIndex(header, "salary_min"),
    salary_max: headerIndex(header, "salary_max"),
    notes: headerIndex(header, "notes"),
    applied_at: headerIndex(header, "applied_at"),
  };
  const missing = (["company", "role"] as const).filter((key) => index[key] < 0);
  if (missing.length) {
    return {
      rows: [],
      errors: [`Missing required columns: ${missing.join(", ")}`],
    };
  }

  const rows: ApplicationInput[] = [];
  const errors: string[] = [];

  table.slice(1).forEach((line, offset) => {
    const lineNo = offset + 2;
    const get = (key: (typeof CSV_HEADERS)[number]) => {
      const i = index[key];
      return i >= 0 ? (line[i] ?? "").trim() : "";
    };
    const company = get("company");
    const role = get("role");
    if (!company || !role) {
      errors.push(`Line ${lineNo}: company and role are required`);
      return;
    }

    const platformRaw = get("platform") || "other";
    const platform = parsePlatform(platformRaw);
    if (!platform) {
      errors.push(
        `Line ${lineNo}: unknown platform "${get("platform")}" — use ${platformLabel("linkedin")} etc.`
      );
      return;
    }

    let status = (get("status").toLowerCase().replaceAll(" ", "_") || "saved") as string;
    status = status.replace("recruiter-screen", "recruiter_screen");
    status = status.replace("hiring-manager", "hiring_manager");
    if (!isStatus(status)) {
      errors.push(
        `Line ${lineNo}: unknown status "${get("status")}" — use ${statusLabel("applied")} etc.`
      );
      return;
    }

    const jobUrl = get("job_url") || null;
    const atsRaw = get("ats");
    let ats = parseAts(atsRaw);
    if (atsRaw && !ats) {
      errors.push(
        `Line ${lineNo}: unknown ATS "${atsRaw}" — use ${atsLabel("greenhouse")} etc.`
      );
      return;
    }
    if (!ats) {
      ats = detectAtsFromUrl(jobUrl) ?? atsFromPlatform(platform) ?? "unknown";
    }

    const salaryMin = get("salary_min");
    const salaryMax = get("salary_max");

    rows.push({
      company,
      role,
      platform,
      ats: resolveAts(ats),
      status,
      location: get("location") || null,
      job_url: jobUrl,
      salary_min: salaryMin ? Number(salaryMin) : null,
      salary_max: salaryMax ? Number(salaryMax) : null,
      notes: get("notes") || null,
      applied_at: get("applied_at") || null,
    });
  });

  return { rows, errors };
}
