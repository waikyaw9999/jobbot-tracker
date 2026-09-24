"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAts, resolveAts, type AtsVendor } from "@/lib/ats";
import {
  companyTitleKey,
  DEFAULT_SEARCH_PREFERENCES,
  isOpportunityStatus,
  normalizeDate,
  parseDigest,
  urlKeyOf,
} from "@/lib/assist";
import { isPlatform, type Platform } from "@/lib/constants";
import { todayIso } from "@/lib/dates";
import {
  deleteOpportunity,
  findDuplicates,
  getOpportunity,
  importDigestRow,
  insertOpportunity,
  promoteOpportunity,
  updateOpportunity,
  updateOpportunityStatus,
  updateSearchPreferences,
  type OpportunityInput,
} from "@/lib/opportunity-queries";
import type { OpportunityStatus } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/", "layout");
}

function readText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function emptyToNull(value: string) {
  return value.trim() ? value.trim() : null;
}

function readOpportunityForm(formData: FormData): OpportunityInput {
  const title = readText(formData, "title");
  const company = readText(formData, "company");
  if (!title || !company) throw new Error("Role and company are required");
  const source = readText(formData, "source");
  if (!isPlatform(source)) throw new Error("Invalid source");
  const status = readText(formData, "status") || "new";
  if (!isOpportunityStatus(status)) throw new Error("Invalid status");
  const atsRaw = readText(formData, "ats");
  if (atsRaw && !isAts(atsRaw)) throw new Error("Invalid ATS");
  const coverLetter = String(formData.get("cover_letter") ?? "").trim();
  if (coverLetter.length > 50000) throw new Error("Cover letter is too long");
  const fitScoreRaw = readText(formData, "fit_score");
  const fitScore = fitScoreRaw ? Number(fitScoreRaw) : null;

  return {
    title,
    company,
    location: emptyToNull(readText(formData, "location")),
    source: source as Platform,
    job_url: emptyToNull(readText(formData, "job_url")),
    ats: resolveAts(atsRaw) as AtsVendor,
    visa_note: emptyToNull(readText(formData, "visa_note")),
    fit: emptyToNull(readText(formData, "fit")),
    fit_reason: emptyToNull(readText(formData, "fit_reason")),
    fit_score: fitScore != null && Number.isFinite(fitScore) ? Math.max(0, Math.round(fitScore)) : null,
    status: status as OpportunityStatus,
    discovered_at: normalizeDate(readText(formData, "discovered_at")) ?? todayIso(),
    notes: emptyToNull(String(formData.get("notes") ?? "")),
    cover_letter: coverLetter || null,
  };
}

export async function createOpportunityAction(formData: FormData) {
  const input = readOpportunityForm(formData);
  if (input.status === "promoted") throw new Error("Use Promote to application");
  const id = await insertOpportunity(input);
  revalidateAll();
  redirect(`/opportunities/${id}`);
}

export async function updateOpportunityAction(id: string, formData: FormData) {
  const existing = await getOpportunity(id);
  if (!existing) throw new Error("Opportunity not found");
  const input = readOpportunityForm(formData);
  if (input.status === "promoted" && !existing.application_id) {
    throw new Error("Use Promote to application");
  }
  await updateOpportunity(id, input);
  revalidateAll();
  redirect(`/opportunities/${id}`);
}

export async function setOpportunityStatusAction(formData: FormData) {
  const id = readText(formData, "id");
  const status = readText(formData, "status");
  if (!id) throw new Error("Missing opportunity");
  if (!isOpportunityStatus(status) || status === "promoted") throw new Error("Invalid status");
  await updateOpportunityStatus(id, status);
  revalidateAll();
}

export async function promoteOpportunityAction(id: string) {
  const applicationId = await promoteOpportunity(id);
  revalidateAll();
  redirect(`/applications/${applicationId}`);
}

export async function deleteOpportunityAction(id: string) {
  await deleteOpportunity(id);
  revalidateAll();
  redirect("/opportunities");
}

export async function findDuplicateMatchesAction(input: {
  company: string;
  title: string;
  jobUrl?: string;
  excludeOpportunityId?: string;
  excludeApplicationId?: string | null;
}) {
  if (!input.company.trim() || !input.title.trim()) return [];
  return findDuplicates(input);
}

export async function savePreferencesAction(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData
) {
  const sources = formData
    .getAll("sources")
    .map((value) => String(value))
    .filter((value): value is Platform => isPlatform(value));
  await updateSearchPreferences({
    include_titles: String(formData.get("include_titles") ?? ""),
    exclude_keywords: String(formData.get("exclude_keywords") ?? ""),
    markets: String(formData.get("markets") ?? ""),
    sources,
    stack_keywords: String(formData.get("stack_keywords") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  revalidateAll();
  return { ok: true, message: "Search preferences saved." };
}

export async function resetPreferencesAction() {
  await updateSearchPreferences({
    include_titles: DEFAULT_SEARCH_PREFERENCES.include_titles,
    exclude_keywords: DEFAULT_SEARCH_PREFERENCES.exclude_keywords,
    markets: DEFAULT_SEARCH_PREFERENCES.markets,
    sources: DEFAULT_SEARCH_PREFERENCES.sources,
    stack_keywords: DEFAULT_SEARCH_PREFERENCES.stack_keywords,
    notes: DEFAULT_SEARCH_PREFERENCES.notes,
  });
  revalidateAll();
  redirect("/opportunities/preferences");
}

export async function importDigestAction(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData
) {
  const file = formData.get("file");
  let text = String(formData.get("digest") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > 1_500_000) {
      return { ok: false, message: "That file is larger than 1.5 MB." };
    }
    text = await file.text();
  }
  const parsed = parseDigest(text);
  const rows = parsed.rows.slice(0, 200);
  if (!rows.length) {
    return { ok: false, message: parsed.errors[0] ?? "No opportunities found in that digest." };
  }

  const recordApplied = formData.get("record_applied") === "on";
  const seenTitle = new Set<string>();
  const seenUrl = new Set<string>();
  let imported = 0;
  let skipped = 0;
  let applied = 0;
  const errors = [...parsed.errors];
  if (parsed.rows.length > 200) errors.push("Only the first 200 rows were imported.");

  for (const row of rows) {
    const titleKey = companyTitleKey(row.company, row.title);
    const urlKey = urlKeyOf(row.jobUrl);
    if (seenTitle.has(titleKey) || (urlKey ? seenUrl.has(urlKey) : false)) {
      skipped += 1;
      continue;
    }
    try {
      const result = await importDigestRow(row, { recordApplied });
      seenTitle.add(titleKey);
      if (urlKey) seenUrl.add(urlKey);
      if (result === "skipped") skipped += 1;
      else if (result === "applied") applied += 1;
      else imported += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Could not import a row.");
    }
  }

  revalidateAll();
  const parts = [
    `Imported ${imported} opportunit${imported === 1 ? "y" : "ies"}.`,
    skipped ? `Skipped ${skipped} duplicate${skipped === 1 ? "" : "s"}.` : null,
    applied
      ? `Recorded ${applied} digest row${applied === 1 ? "" : "s"} as Applied in the pipeline. Nothing was emailed or submitted.`
      : null,
    errors.length ? errors.slice(0, 4).join(" ") : null,
  ].filter(Boolean);
  return { ok: imported + applied > 0, message: parts.join(" ") };
}
