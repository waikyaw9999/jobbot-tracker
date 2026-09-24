import "server-only";

import { randomUUID } from "node:crypto";
import {
  companyTitleKey,
  DEFAULT_SEARCH_PREFERENCES,
  inferMarket,
  inferSeniority,
  isContactChannel,
  isMarketCode,
  isOpportunityStatus,
  isSponsorship,
  parseSponsorship,
  storableContactEmail,
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
  ContactChannel,
  DuplicateMatch,
  Opportunity,
  OpportunityContact,
  OpportunityCounts,
  OpportunityDraft,
  OpportunityEvent,
  OpportunityStatus,
  SearchPreferences,
  Sponsorship,
} from "@/lib/types";

export type OpportunityContactInput = {
  email?: string | null;
  channel?: ContactChannel | null;
  verified?: boolean;
  verification_note?: string | null;
  userEntered?: boolean;
};

export type OpportunityDraftInput = {
  to?: string | null;
  subject?: string | null;
  body?: string | null;
};

export type OpportunityInput = {
  title: string;
  company: string;
  location?: string | null;
  market?: string | null;
  seniority?: string | null;
  tech_tags?: string | null;
  source: Platform;
  job_url?: string | null;
  ats?: AtsVendor | null;
  visa_note?: string | null;
  sponsorship?: Sponsorship | null;
  nationality_constraint?: string | null;
  fit?: string | null;
  fit_score?: number | null;
  fit_reason?: string | null;
  status: OpportunityStatus;
  skip_reason?: string | null;
  posted_at?: string | null;
  discovered_at?: string | null;
  notes?: string | null;
  cover_letter?: string | null;
  application_id?: string | null;
  contact?: OpportunityContactInput | null;
  draft?: OpportunityDraftInput | null;
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
      id, include_titles, exclude_keywords, markets, market_codes, min_seniority,
      require_sponsorship_au, never_invent_email, sources, stack_keywords, notes, updated_at
    ) VALUES (
      'default', @include_titles, @exclude_keywords, @markets, @market_codes, @min_seniority,
      @require_sponsorship_au, 1, @sources, @stack_keywords, @notes, @updated_at
    )`,
    {
      include_titles: DEFAULT_SEARCH_PREFERENCES.include_titles,
      exclude_keywords: DEFAULT_SEARCH_PREFERENCES.exclude_keywords,
      markets: DEFAULT_SEARCH_PREFERENCES.markets,
      market_codes: JSON.stringify(DEFAULT_SEARCH_PREFERENCES.market_codes),
      min_seniority: DEFAULT_SEARCH_PREFERENCES.min_seniority,
      require_sponsorship_au: DEFAULT_SEARCH_PREFERENCES.require_sponsorship_au,
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
  market_codes: string[];
  min_seniority: string;
  require_sponsorship_au: boolean;
  sources: Platform[];
  stack_keywords: string;
  notes: string;
}) {
  await getSearchPreferences();
  const codes = input.market_codes.filter((code) => isMarketCode(code));
  await run(
    `UPDATE search_preferences SET
      include_titles = @include_titles,
      exclude_keywords = @exclude_keywords,
      markets = @markets,
      market_codes = @market_codes,
      min_seniority = @min_seniority,
      require_sponsorship_au = @require_sponsorship_au,
      never_invent_email = 1,
      sources = @sources,
      stack_keywords = @stack_keywords,
      notes = @notes,
      updated_at = @updated_at
    WHERE id = 'default'`,
    {
      include_titles: input.include_titles,
      exclude_keywords: input.exclude_keywords,
      markets: input.markets,
      market_codes: JSON.stringify(codes.length ? codes : DEFAULT_SEARCH_PREFERENCES.market_codes),
      min_seniority: input.min_seniority || "senior",
      require_sponsorship_au: input.require_sponsorship_au ? 1 : 0,
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
  marketCode?: string;
  tech?: string;
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
    where.push("(location LIKE @market OR market LIKE @market OR visa_note LIKE @market OR notes LIKE @market)");
    params.market = `%${filters.market.trim()}%`;
  }
  if (filters?.marketCode && isMarketCode(filters.marketCode)) {
    where.push(marketCodeClause(filters.marketCode));
    params.marketCode = filters.marketCode;
  }
  if (filters?.tech?.trim()) {
    where.push("(tech_tags LIKE @tech OR title LIKE @tech OR notes LIKE @tech)");
    params.tech = `%${filters.tech.trim()}%`;
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
    portal_only: 0,
    skipped: 0,
    promoted: 0,
    closed: 0,
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
      id, title, company, location, market, seniority, tech_tags, source, job_url, url_key,
      company_title_key, ats, visa_note, sponsorship, nationality_constraint, fit, fit_score,
      fit_reason, status, skip_reason, posted_at, discovered_at, notes, cover_letter,
      application_id, created_at, updated_at
    ) VALUES (
      @id, @title, @company, @location, @market, @seniority, @tech_tags, @source, @job_url, @url_key,
      @company_title_key, @ats, @visa_note, @sponsorship, @nationality_constraint, @fit, @fit_score,
      @fit_reason, @status, @skip_reason, @posted_at, @discovered_at, @notes, @cover_letter,
      @application_id, @created_at, @updated_at
    )`,
    opportunityArgs(opportunityId, input, now, now)
  );
  await saveContactAndDraft(opportunityId, input);
  await addOpportunityEvent(opportunityId, "created", `Saved ${input.title} at ${input.company}.`);
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
      market = @market,
      seniority = @seniority,
      tech_tags = @tech_tags,
      source = @source,
      job_url = @job_url,
      url_key = @url_key,
      company_title_key = @company_title_key,
      ats = @ats,
      visa_note = @visa_note,
      sponsorship = @sponsorship,
      nationality_constraint = @nationality_constraint,
      fit = @fit,
      fit_score = @fit_score,
      fit_reason = @fit_reason,
      status = @status,
      skip_reason = @skip_reason,
      posted_at = @posted_at,
      discovered_at = @discovered_at,
      notes = @notes,
      cover_letter = @cover_letter,
      updated_at = @updated_at
    WHERE id = @id`,
    opportunityArgs(opportunityId, input, existing.created_at, nowIso())
  );
  await saveContactAndDraft(opportunityId, input);
  if (existing.status !== input.status) {
    const reason = input.status === "skipped" ? emptyToNull(input.skip_reason) : null;
    await addOpportunityEvent(
      opportunityId,
      "status",
      reason
        ? `Status ${existing.status.replaceAll("_", " ")} → ${input.status.replaceAll("_", " ")}. ${reason}`
        : `Status ${existing.status.replaceAll("_", " ")} → ${input.status.replaceAll("_", " ")}.`
    );
  }
}

export async function updateOpportunityStatus(
  opportunityId: string,
  status: OpportunityStatus,
  skipReason?: string | null
) {
  if (status === "promoted") throw new Error("Use Promote to application");
  const existing = await getOpportunity(opportunityId);
  if (!existing) throw new Error("Opportunity not found");
  const reason = status === "skipped" ? emptyToNull(skipReason) ?? existing.skip_reason : null;
  if (existing.status === status && reason === existing.skip_reason) return;
  await run(
    "UPDATE opportunities SET status = ?, skip_reason = ?, updated_at = ? WHERE id = ?",
    [status, reason, nowIso(), opportunityId]
  );
  const from = existing.status.replaceAll("_", " ");
  const to = status.replaceAll("_", " ");
  await addOpportunityEvent(
    opportunityId,
    "status",
    reason ? `Status ${from} → ${to}. ${reason}` : `Status ${from} → ${to}.`
  );
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
    await addOpportunityEvent(
      opportunityId,
      "promoted",
      "Promoted into a Saved application. Nothing was emailed or submitted."
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
      market: row.marketCode,
      seniority: row.seniority,
      tech_tags: row.techTags,
      source: row.source,
      job_url: row.jobUrl,
      ats,
      visa_note: row.visaNote,
      sponsorship: row.sponsorship,
      nationality_constraint: row.nationalityConstraint,
      skip_reason: row.digestStatus === "skipped" ? row.skipReason : null,
      posted_at: row.postedAt,
      fit: row.fit,
      fit_reason: null,
      fit_score: null,
      discovered_at: discovered,
      cover_letter: row.coverLetter,
      contact: contactFromDigest(row),
      draft: draftFromDigest(row),
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
    market: normalizeMarket(input.market, input.location),
    seniority: emptyToNull(input.seniority) ?? inferSeniority(input.title),
    tech_tags: emptyToNull(input.tech_tags),
    source: input.source,
    job_url: emptyToNull(input.job_url),
    url_key: urlKeyOf(input.job_url),
    company_title_key: companyTitleKey(input.company, input.title),
    ats: resolveAts(input.ats),
    visa_note: emptyToNull(input.visa_note),
    sponsorship: normalizeSponsorship(input.sponsorship, input.visa_note),
    nationality_constraint: emptyToNull(input.nationality_constraint),
    fit: emptyToNull(input.fit),
    fit_score: input.fit_score ?? null,
    fit_reason: emptyToNull(input.fit_reason),
    status: input.status,
    skip_reason: input.status === "skipped" ? emptyToNull(input.skip_reason) : null,
    posted_at: emptyToNull(input.posted_at),
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

function normalizeMarket(market: string | null | undefined, location: string | null | undefined) {
  const code = emptyToNull(market)?.toUpperCase() ?? "";
  if (isMarketCode(code)) return code;
  return inferMarket(location);
}

function normalizeSponsorship(
  sponsorship: string | null | undefined,
  visaNote: string | null | undefined
): Sponsorship {
  const value = emptyToNull(sponsorship)?.toLowerCase() ?? "";
  if (isSponsorship(value)) return value;
  return parseSponsorship(visaNote);
}

function marketCodeClause(code: string) {
  if (code === "SG") {
    return "(market = @marketCode OR ((market IS NULL OR market = '') AND location LIKE '%singapore%'))";
  }
  if (code === "TH") {
    return "(market = @marketCode OR ((market IS NULL OR market = '') AND (location LIKE '%thailand%' OR location LIKE '%bangkok%')))";
  }
  if (code === "AU") {
    return "(market = @marketCode OR ((market IS NULL OR market = '') AND (location LIKE '%australia%' OR location LIKE '%sydney%' OR location LIKE '%melbourne%' OR location LIKE '%brisbane%' OR location LIKE '%perth%')))";
  }
  return "market = @marketCode";
}

export async function getOpportunityContact(opportunityId: string) {
  return get<OpportunityContact>(
    "SELECT * FROM opportunity_contacts WHERE opportunity_id = ?",
    [opportunityId]
  );
}

export async function getLatestDraft(opportunityId: string) {
  return get<OpportunityDraft>(
    `SELECT * FROM opportunity_drafts WHERE opportunity_id = ? ORDER BY created_at DESC LIMIT 1`,
    [opportunityId]
  );
}

export async function listOpportunityEvents(opportunityId: string, limit = 20) {
  return all<OpportunityEvent>(
    `SELECT * FROM opportunity_events WHERE opportunity_id = ? ORDER BY created_at DESC LIMIT ?`,
    [opportunityId, limit]
  );
}

export async function listRecentOpportunityEvents(limit = 8) {
  return all<OpportunityEvent>(
    `SELECT * FROM opportunity_events ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
}

export async function addOpportunityEvent(
  opportunityId: string | null,
  type: string,
  message: string
) {
  await run(
    `INSERT INTO opportunity_events (id, opportunity_id, type, message, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id(), opportunityId, type, message, nowIso()]
  );
}

async function saveContactAndDraft(opportunityId: string, input: OpportunityInput) {
  if (input.contact) await upsertOpportunityContact(opportunityId, input.contact);
  const body = emptyToNull(input.draft?.body) ?? emptyToNull(input.cover_letter);
  if (!body && !input.draft) return;
  if (!body) return;
  const contact = input.contact ? resolvedContact(input.contact) : null;
  const explicitTo = storableContactEmail(input.draft?.to, { userEntered: true, verified: false });
  const verifiedTo = contact?.verified && contact.email ? contact.email : null;
  await insertDraftIfChanged(opportunityId, {
    to: explicitTo ?? verifiedTo,
    subject: emptyToNull(input.draft?.subject) ?? `${input.title.trim()} at ${input.company.trim()}`,
    body,
  });
}

function contactFromDigest(row: DigestRow): OpportunityContactInput | null {
  const email = row.contactEmail;
  const channel = row.contactChannel ?? (email ? "email" : "portal");
  if (!email && !row.contactNote && !row.contactChannel) return null;
  const stored = storableContactEmail(email, { userEntered: false, verified: row.contactVerified });
  const omitted =
    email && !stored ? "Unverified address was not stored." : null;
  return {
    email: stored,
    channel,
    verified: Boolean(stored) && row.contactVerified,
    verification_note: [row.contactNote, omitted].filter(Boolean).join(" ") || null,
    userEntered: false,
  };
}

function draftFromDigest(row: DigestRow): OpportunityDraftInput | null {
  if (!row.coverLetter && !row.draftSubject && !row.draftTo) return null;
  const to =
    row.draftTo ??
    (row.contactVerified ? storableContactEmail(row.contactEmail, { userEntered: false, verified: true }) : null);
  return {
    to,
    subject: row.draftSubject,
    body: row.coverLetter,
  };
}

function resolvedContact(input: OpportunityContactInput) {
  const verified = Boolean(input.verified);
  const email = storableContactEmail(input.email, {
    userEntered: Boolean(input.userEntered),
    verified,
  });
  const omitted =
    emptyToNull(input.email) && !email ? "Unverified address was not stored." : null;
  const channel = input.channel && isContactChannel(input.channel) ? input.channel : email ? "email" : "portal";
  return {
    email,
    channel,
    verified: email ? verified : false,
    verification_note: [emptyToNull(input.verification_note), omitted].filter(Boolean).join(" ") || null,
  };
}

async function upsertOpportunityContact(opportunityId: string, input: OpportunityContactInput) {
  const contact = resolvedContact(input);
  await run(
    `INSERT INTO opportunity_contacts (
      opportunity_id, email, channel, verified, verification_note, updated_at
    ) VALUES (
      @opportunity_id, @email, @channel, @verified, @verification_note, @updated_at
    )
    ON CONFLICT(opportunity_id) DO UPDATE SET
      email = excluded.email,
      channel = excluded.channel,
      verified = excluded.verified,
      verification_note = excluded.verification_note,
      updated_at = excluded.updated_at`,
    {
      opportunity_id: opportunityId,
      email: contact.email,
      channel: contact.channel,
      verified: contact.verified ? 1 : 0,
      verification_note: contact.verification_note,
      updated_at: nowIso(),
    }
  );
}

async function insertDraftIfChanged(
  opportunityId: string,
  draft: { to: string | null; subject: string | null; body: string }
) {
  const latest = await getLatestDraft(opportunityId);
  if (
    latest &&
    latest.body === draft.body &&
    (latest.to_address ?? null) === draft.to &&
    (latest.subject ?? null) === draft.subject
  ) {
    return;
  }
  await run(
    `INSERT INTO opportunity_drafts (id, opportunity_id, to_address, subject, body, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id(), opportunityId, draft.to, draft.subject, draft.body, nowIso()]
  );
}
