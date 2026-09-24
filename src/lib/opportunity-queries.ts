import "server-only";

import { randomUUID } from "node:crypto";
import {
  companyTitleKey,
  DEFAULT_SEARCH_PREFERENCES,
  isOpportunityStatus,
  urlKeyOf,
  type DigestRow,
} from "@/lib/assist";
import { atsFromPlatform, detectAtsFromUrl, resolveAts, type AtsVendor } from "@/lib/ats";
import { isPlatform, type Platform } from "@/lib/constants";
import { nowIso, todayIso } from "@/lib/dates";
import { all, get, run, withTransaction } from "@/lib/db";
import { addActivity, insertApplication } from "@/lib/queries";
import type {
  Application,
  DuplicateMatch,
  Opportunity,
  OpportunityCounts,
  OpportunityStatus,
  SearchPreferences,
} from "@/lib/types";

export type OpportunityInput = {
  title: string;
  company: string;
  location?: string | null;
  source: Platform;
  job_url?: string | null;
  ats?: AtsVendor | null;
  visa_note?: string | null;
  fit?: string | null;
  fit_score?: number | null;
  fit_reason?: string | null;
  status: OpportunityStatus;
  discovered_at?: string | null;
  notes?: string | null;
  cover_letter?: string | null;
  application_id?: string | null;
};

export type OpportunityListItem = Opportunity & { duplicate: boolean };

function id() {
  return randomUUID();
}

export async function getSearchPreferences(): Promise<SearchPreferences> {
  const existing = await get<SearchPreferences>(
    "SELECT * FROM search_preferences WHERE id = 'default'"
  );
  if (existing) return existing;
  await run(
    `INSERT OR IGNORE INTO search_preferences (
      id, include_titles, exclude_keywords, markets, sources, stack_keywords, notes, updated_at
    ) VALUES (
      'default', @include_titles, @exclude_keywords, @markets, @sources, @stack_keywords, @notes, @updated_at
    )`,
    {
      include_titles: DEFAULT_SEARCH_PREFERENCES.include_titles,
      exclude_keywords: DEFAULT_SEARCH_PREFERENCES.exclude_keywords,
      markets: DEFAULT_SEARCH_PREFERENCES.markets,
      sources: JSON.stringify(DEFAULT_SEARCH_PREFERENCES.sources),
      stack_keywords: DEFAULT_SEARCH_PREFERENCES.stack_keywords,
      notes: DEFAULT_SEARCH_PREFERENCES.notes,
      updated_at: nowIso(),
    }
  );
  const row = await get<SearchPreferences>("SELECT * FROM search_preferences WHERE id = 'default'");
  if (!row) throw new Error("Search preferences could not be loaded");
  return row;
}

export async function updateSearchPreferences(input: {
  include_titles: string;
  exclude_keywords: string;
  markets: string;
  sources: Platform[];
  stack_keywords: string;
  notes: string;
}) {
  await getSearchPreferences();
  await run(
    `UPDATE search_preferences SET
      include_titles = @include_titles,
      exclude_keywords = @exclude_keywords,
      markets = @markets,
      sources = @sources,
      stack_keywords = @stack_keywords,
      notes = @notes,
      updated_at = @updated_at
    WHERE id = 'default'`,
    {
      include_titles: input.include_titles,
      exclude_keywords: input.exclude_keywords,
      markets: input.markets,
      sources: JSON.stringify(input.sources),
      stack_keywords: input.stack_keywords,
      notes: input.notes,
      updated_at: nowIso(),
    }
  );
}

export async function getOpportunity(opportunityId: string) {
  return get<Opportunity>("SELECT * FROM opportunities WHERE id = ?", [opportunityId]);
}

export async function listOpportunitiesForApplication(applicationId: string) {
  return all<Pick<Opportunity, "id" | "title" | "company" | "status">>(
    "SELECT id, title, company, status FROM opportunities WHERE application_id = ? ORDER BY updated_at DESC",
    [applicationId]
  );
}

export async function listOpportunities(filters?: {
  q?: string;
  status?: OpportunityStatus | "all";
  source?: Platform | "all";
  market?: string;
}): Promise<OpportunityListItem[]> {
  const where: string[] = [];
  const params: Record<string, string> = {};
  if (filters?.q?.trim()) {
    where.push(
      "(title LIKE @q OR company LIKE @q OR location LIKE @q OR notes LIKE @q OR visa_note LIKE @q OR cover_letter LIKE @q OR job_url LIKE @q)"
    );
    params.q = `%${filters.q.trim()}%`;
  }
  if (filters?.status && filters.status !== "all") {
    where.push("status = @status");
    params.status = filters.status;
  }
  if (filters?.source && filters.source !== "all") {
    where.push("source = @source");
    params.source = filters.source;
  }
  if (filters?.market?.trim()) {
    where.push("(location LIKE @market OR visa_note LIKE @market OR notes LIKE @market)");
    params.market = `%${filters.market.trim()}%`;
  }

  const opportunities = await all<Opportunity>(
    `SELECT * FROM opportunities ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY updated_at DESC`,
    params
  );
  return annotateDuplicates(opportunities);
}

export async function getOpportunityCounts(): Promise<OpportunityCounts> {
  const rows = await all<{ status: string; n: number }>(
    "SELECT status, COUNT(*) AS n FROM opportunities GROUP BY status"
  );
  const counts: OpportunityCounts = {
    total: 0,
    new: 0,
    worth_a_look: 0,
    draft_ready: 0,
    skipped: 0,
    promoted: 0,
  };
  for (const row of rows) {
    const count = row.n ?? 0;
    counts.total += count;
    if (isOpportunityStatus(row.status)) counts[row.status] = count;
  }
  return counts;
}

export async function listDraftReadyOpportunities(limit = 5) {
  return all<Opportunity>(
    `SELECT * FROM opportunities WHERE status = 'draft_ready' ORDER BY updated_at DESC LIMIT ?`,
    [limit]
  );
}

export async function findDuplicates(input: {
  company: string;
  title: string;
  jobUrl?: string | null;
  excludeOpportunityId?: string;
  excludeApplicationId?: string | null;
}): Promise<DuplicateMatch[]> {
  const titleKey = companyTitleKey(input.company, input.title);
  const urlKey = urlKeyOf(input.jobUrl);
  if (!titleKey || titleKey === "|") return [];

  const [opportunities, applications] = await Promise.all([
    all<Pick<Opportunity, "id" | "title" | "company" | "company_title_key" | "url_key">>(
      "SELECT id, title, company, company_title_key, url_key FROM opportunities"
    ),
    all<Pick<Application, "id" | "company" | "role" | "job_url">>(
      "SELECT id, company, role, job_url FROM applications"
    ),
  ]);

  const matches: DuplicateMatch[] = [];
  const seen = new Set<string>();

  const push = (match: DuplicateMatch) => {
    const key = `${match.kind}:${match.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    matches.push(match);
  };

  for (const opportunity of opportunities) {
    if (opportunity.id === input.excludeOpportunityId) continue;
    const urlHit = Boolean(urlKey && opportunity.url_key && opportunity.url_key === urlKey);
    const titleHit = opportunity.company_title_key === titleKey;
    if (!urlHit && !titleHit) continue;
    push({
      kind: "opportunity",
      id: opportunity.id,
      title: opportunity.title,
      company: opportunity.company,
      href: `/opportunities/${opportunity.id}`,
      reason: urlHit ? "url" : "company_title",
    });
  }

  for (const application of applications) {
    if (application.id === input.excludeApplicationId) continue;
    const urlHit = Boolean(urlKey && urlKeyOf(application.job_url) === urlKey);
    const titleHit = companyTitleKey(application.company, application.role) === titleKey;
    if (!urlHit && !titleHit) continue;
    push({
      kind: "application",
      id: application.id,
      title: application.role,
      company: application.company,
      href: `/applications/${application.id}`,
      reason: urlHit ? "url" : "company_title",
    });
  }

  return matches;
}

export async function insertOpportunity(input: OpportunityInput) {
  if (input.status === "promoted" && !input.application_id) {
    throw new Error("Promoted opportunities need a linked application");
  }
  const opportunityId = id();
  const now = nowIso();
  await run(
    `INSERT INTO opportunities (
      id, title, company, location, source, job_url, url_key, company_title_key,
      ats, visa_note, fit, fit_score, fit_reason, status, discovered_at, notes,
      cover_letter, application_id, created_at, updated_at
    ) VALUES (
      @id, @title, @company, @location, @source, @job_url, @url_key, @company_title_key,
      @ats, @visa_note, @fit, @fit_score, @fit_reason, @status, @discovered_at, @notes,
      @cover_letter, @application_id, @created_at, @updated_at
    )`,
    opportunityArgs(opportunityId, input, now, now)
  );
  return opportunityId;
}

export async function updateOpportunity(opportunityId: string, input: OpportunityInput) {
  const existing = await getOpportunity(opportunityId);
  if (!existing) throw new Error("Opportunity not found");
  if (input.status === "promoted" && !existing.application_id) {
    throw new Error("Use Promote to application");
  }
  await run(
    `UPDATE opportunities SET
      title = @title,
      company = @company,
      location = @location,
      source = @source,
      job_url = @job_url,
      url_key = @url_key,
      company_title_key = @company_title_key,
      ats = @ats,
      visa_note = @visa_note,
      fit = @fit,
      fit_score = @fit_score,
      fit_reason = @fit_reason,
      status = @status,
      discovered_at = @discovered_at,
      notes = @notes,
      cover_letter = @cover_letter,
      updated_at = @updated_at
    WHERE id = @id`,
    opportunityArgs(opportunityId, input, existing.created_at, nowIso())
  );
}

export async function updateOpportunityStatus(opportunityId: string, status: OpportunityStatus) {
  if (status === "promoted") throw new Error("Use Promote to application");
  const existing = await getOpportunity(opportunityId);
  if (!existing) throw new Error("Opportunity not found");
  if (existing.status === status) return;
  await run("UPDATE opportunities SET status = ?, updated_at = ? WHERE id = ?", [
    status,
    nowIso(),
    opportunityId,
  ]);
}

export async function deleteOpportunity(opportunityId: string) {
  await run("DELETE FROM opportunities WHERE id = ?", [opportunityId]);
}

export async function promoteOpportunity(opportunityId: string) {
  return withTransaction(async () => {
    const existing = await getOpportunity(opportunityId);
    if (!existing) throw new Error("Opportunity not found");
    if (existing.application_id) {
      if (existing.status !== "promoted") {
        await run("UPDATE opportunities SET status = 'promoted', updated_at = ? WHERE id = ?", [
          nowIso(),
          opportunityId,
        ]);
      }
      return existing.application_id;
    }

    const duplicates = await findDuplicates({
      company: existing.company,
      title: existing.title,
      jobUrl: existing.job_url,
      excludeOpportunityId: existing.id,
    });
    const applicationMatch =
      duplicates.find((match) => match.kind === "application" && match.reason === "url") ??
      duplicates.find((match) => match.kind === "application");

    const applicationId = applicationMatch
      ? applicationMatch.id
      : await insertApplication({
          company: existing.company,
          role: existing.title,
          platform: isPlatform(existing.source) ? existing.source : "other",
          ats: resolveAts(
            existing.ats ?? detectAtsFromUrl(existing.job_url) ?? atsFromPlatform(existing.source)
          ),
          status: "saved",
          location: existing.location,
          job_url: existing.job_url,
          notes: promotionNotes(existing),
        });

    await run(
      `UPDATE opportunities
       SET status = 'promoted', application_id = ?, updated_at = ?
       WHERE id = ?`,
      [applicationId, nowIso(), opportunityId]
    );

    if (applicationMatch) {
      await addActivity(
        applicationId,
        "updated",
        `Linked opportunity ${existing.title} at ${existing.company}`
      );
    }

    return applicationId;
  });
}

export async function importDigestRow(
  row: DigestRow,
  options: { recordApplied: boolean }
): Promise<"imported" | "skipped" | "applied"> {
  return withTransaction(async () => {
    const duplicates = await findDuplicates({
      company: row.company,
      title: row.title,
      jobUrl: row.jobUrl,
    });
    if (duplicates.length) return "skipped";

    const ats = resolveAts(detectAtsFromUrl(row.jobUrl) ?? atsFromPlatform(row.source));
    const discovered = row.discoveredAt ?? todayIso();
    const base = {
      title: row.title,
      company: row.company,
      location: row.location,
      source: row.source,
      job_url: row.jobUrl,
      ats,
      visa_note: row.visaNote,
      fit: row.fit,
      fit_reason: null,
      fit_score: null,
      discovered_at: discovered,
      cover_letter: row.coverLetter,
    };

    if (row.digestStatus === "applied" && options.recordApplied) {
      const applicationId = await insertApplication({
        company: row.company,
        role: row.title,
        platform: row.source,
        ats,
        status: "applied",
        location: row.location,
        job_url: row.jobUrl,
        notes: [
          "Imported from a digest row marked applied. JobBot did not email or submit this.",
          row.visaNote ? `Visa / sponsor: ${row.visaNote}` : null,
          row.fit ? `Fit: ${row.fit}` : null,
          row.notes,
          row.coverLetter ? "Cover letter draft is stored on the linked opportunity." : null,
        ]
          .filter(Boolean)
          .join("\n\n"),
      });
      await insertOpportunity({
        ...base,
        status: "promoted",
        notes: row.notes,
        application_id: applicationId,
      });
      return "applied";
    }

    const appliedNote =
      row.digestStatus === "applied"
        ? "Digest marked this applied. Confirm before treating it as submitted — JobBot did not email or apply."
        : null;
    const status: OpportunityStatus =
      row.digestStatus === "applied"
        ? row.coverLetter
          ? "draft_ready"
          : "worth_a_look"
        : row.digestStatus;

    await insertOpportunity({
      ...base,
      status,
      notes: [appliedNote, row.notes].filter(Boolean).join("\n\n") || null,
      application_id: null,
    });
    return "imported";
  });
}

async function annotateDuplicates(opportunities: Opportunity[]): Promise<OpportunityListItem[]> {
  if (!opportunities.length) return [];
  const [keys, applications] = await Promise.all([
    all<Pick<Opportunity, "id" | "company_title_key" | "url_key">>(
      "SELECT id, company_title_key, url_key FROM opportunities"
    ),
    all<Pick<Application, "id" | "company" | "role" | "job_url">>(
      "SELECT id, company, role, job_url FROM applications"
    ),
  ]);

  const titleCounts = new Map<string, number>();
  const urlCounts = new Map<string, number>();
  for (const key of keys) {
    titleCounts.set(key.company_title_key, (titleCounts.get(key.company_title_key) ?? 0) + 1);
    if (key.url_key) urlCounts.set(key.url_key, (urlCounts.get(key.url_key) ?? 0) + 1);
  }

  const appsByTitle = new Map<string, string[]>();
  const appsByUrl = new Map<string, string[]>();
  for (const application of applications) {
    const titleKey = companyTitleKey(application.company, application.role);
    const titleIds = appsByTitle.get(titleKey) ?? [];
    titleIds.push(application.id);
    appsByTitle.set(titleKey, titleIds);
    const urlKey = urlKeyOf(application.job_url);
    if (!urlKey) continue;
    const urlIds = appsByUrl.get(urlKey) ?? [];
    urlIds.push(application.id);
    appsByUrl.set(urlKey, urlIds);
  }

  return opportunities.map((opportunity) => {
    const otherApp = (ids: string[] | undefined) =>
      (ids ?? []).some((applicationId) => applicationId !== opportunity.application_id);
    return {
      ...opportunity,
      duplicate:
        (titleCounts.get(opportunity.company_title_key) ?? 0) > 1 ||
        (opportunity.url_key ? (urlCounts.get(opportunity.url_key) ?? 0) > 1 : false) ||
        otherApp(appsByTitle.get(opportunity.company_title_key)) ||
        (opportunity.url_key ? otherApp(appsByUrl.get(opportunity.url_key)) : false),
    };
  });
}

function opportunityArgs(opportunityId: string, input: OpportunityInput, createdAt: string, updatedAt: string) {
  return {
    id: opportunityId,
    title: input.title.trim(),
    company: input.company.trim(),
    location: emptyToNull(input.location),
    source: input.source,
    job_url: emptyToNull(input.job_url),
    url_key: urlKeyOf(input.job_url),
    company_title_key: companyTitleKey(input.company, input.title),
    ats: resolveAts(input.ats),
    visa_note: emptyToNull(input.visa_note),
    fit: emptyToNull(input.fit),
    fit_score: input.fit_score ?? null,
    fit_reason: emptyToNull(input.fit_reason),
    status: input.status,
    discovered_at: emptyToNull(input.discovered_at) ?? todayIso(),
    notes: emptyToNull(input.notes),
    cover_letter: emptyToNull(input.cover_letter),
    application_id: input.application_id ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function promotionNotes(opportunity: Opportunity) {
  return [
    "Promoted from Opportunities into Saved. Nothing was emailed or submitted.",
    opportunity.visa_note ? `Visa / sponsor: ${opportunity.visa_note}` : null,
    opportunity.fit ? `Fit: ${opportunity.fit}` : null,
    opportunity.fit_reason,
    opportunity.notes,
    opportunity.cover_letter ? "Cover letter draft is stored on the linked opportunity." : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
