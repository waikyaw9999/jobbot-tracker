import "server-only";

import { randomUUID } from "node:crypto";
import { all, get, run } from "@/lib/db";
import { isAts, resolveAts, type AtsVendor } from "@/lib/ats";
import {
  PIPELINE_STATUSES,
  statusLabel,
  type Platform,
  type Status,
} from "@/lib/constants";
import { addDaysIso, nowIso, todayIso } from "@/lib/dates";
import type {
  Activity,
  ActivityWithApp,
  Application,
  ApplicationInput,
  AtsCount,
  Contact,
  ContactWithApp,
  DashboardStats,
  FollowUp,
  FollowUpWithApp,
} from "@/lib/types";

function id() {
  return randomUUID();
}

export async function listApplications(filters?: {
  q?: string;
  status?: Status | "all";
  platform?: Platform | "all";
  ats?: AtsVendor | "all";
}) {
  const where: string[] = [];
  const params: Record<string, string> = {};

  if (filters?.q?.trim()) {
    where.push(
      "(company LIKE @q OR role LIKE @q OR location LIKE @q OR notes LIKE @q)"
    );
    params.q = `%${filters.q.trim()}%`;
  }
  if (filters?.status && filters.status !== "all") {
    where.push("status = @status");
    params.status = filters.status;
  }
  if (filters?.platform && filters.platform !== "all") {
    where.push("platform = @platform");
    params.platform = filters.platform;
  }
  if (filters?.ats && filters.ats !== "all") {
    if (filters.ats === "unknown") {
      where.push("(ats IS NULL OR ats = @ats)");
    } else {
      where.push("ats = @ats");
    }
    params.ats = filters.ats;
  }

  const sql = `SELECT * FROM applications ${
    where.length ? `WHERE ${where.join(" AND ")}` : ""
  } ORDER BY updated_at DESC`;

  return all<Application>(sql, params);
}

export async function getApplication(applicationId: string) {
  return get<Application>("SELECT * FROM applications WHERE id = ?", [
    applicationId,
  ]);
}

export async function countSampleApplications() {
  const row = await get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM applications WHERE is_sample = 1"
  );
  return row?.n ?? 0;
}

export async function insertApplication(
  input: ApplicationInput,
  options?: { isSample?: boolean; skipAutoFollowUp?: boolean }
) {
  const now = nowIso();
  const applicationId = id();
  const status = input.status;
  const appliedAt =
    input.applied_at ?? (status === "applied" || !isSavedLike(status) ? todayIso() : null);

  await run(
    `INSERT INTO applications (
      id, company, role, platform, ats, status, location, job_url,
      salary_min, salary_max, notes, applied_at, created_at, updated_at, is_sample
    ) VALUES (
      @id, @company, @role, @platform, @ats, @status, @location, @job_url,
      @salary_min, @salary_max, @notes, @applied_at, @created_at, @updated_at, @is_sample
    )`,
    {
      id: applicationId,
      company: input.company,
      role: input.role,
      platform: input.platform,
      ats: resolveAts(input.ats),
      status,
      location: emptyToNull(input.location),
      job_url: emptyToNull(input.job_url),
      salary_min: input.salary_min ?? null,
      salary_max: input.salary_max ?? null,
      notes: emptyToNull(input.notes),
      applied_at: emptyToNull(appliedAt),
      created_at: now,
      updated_at: now,
      is_sample: options?.isSample ? 1 : 0,
    }
  );

  await addActivity(
    applicationId,
    "created",
    `Added ${input.role} at ${input.company} · ${statusLabel(status)}`
  );

  if (!options?.skipAutoFollowUp) {
    await maybeAutoFollowUp(applicationId, undefined, status);
  }

  return applicationId;
}

export async function updateApplication(
  applicationId: string,
  input: ApplicationInput
) {
  const existing = await getApplication(applicationId);
  if (!existing) throw new Error("Application not found");

  const now = nowIso();
  const appliedAt =
    input.applied_at ??
    existing.applied_at ??
    (input.status === "applied" ? todayIso() : null);

  await run(
    `UPDATE applications SET
      company = @company,
      role = @role,
      platform = @platform,
      ats = @ats,
      status = @status,
      location = @location,
      job_url = @job_url,
      salary_min = @salary_min,
      salary_max = @salary_max,
      notes = @notes,
      applied_at = @applied_at,
      updated_at = @updated_at
    WHERE id = @id`,
    {
      id: applicationId,
      company: input.company,
      role: input.role,
      platform: input.platform,
      ats: resolveAts(input.ats),
      status: input.status,
      location: emptyToNull(input.location),
      job_url: emptyToNull(input.job_url),
      salary_min: input.salary_min ?? null,
      salary_max: input.salary_max ?? null,
      notes: emptyToNull(input.notes),
      applied_at: emptyToNull(appliedAt),
      updated_at: now,
    }
  );

  if (existing.status !== input.status) {
    await addActivity(
      applicationId,
      "status_changed",
      `Status ${statusLabel(existing.status)} → ${statusLabel(input.status)}`
    );
    await maybeAutoFollowUp(applicationId, existing.status, input.status);
  } else {
    await addActivity(applicationId, "updated", "Application details updated");
  }
}

export async function updateApplicationStatus(applicationId: string, status: Status) {
  const existing = await getApplication(applicationId);
  if (!existing) throw new Error("Application not found");
  if (existing.status === status) return;

  const now = nowIso();
  const appliedAt =
    existing.applied_at ?? (status === "applied" ? todayIso() : existing.applied_at);

  await run(
    `UPDATE applications
     SET status = @status, applied_at = @applied_at, updated_at = @updated_at
     WHERE id = @id`,
    {
      id: applicationId,
      status,
      applied_at: appliedAt,
      updated_at: now,
    }
  );

  await addActivity(
    applicationId,
    "status_changed",
    `Status ${statusLabel(existing.status)} → ${statusLabel(status)}`
  );
  await maybeAutoFollowUp(applicationId, existing.status, status);
}

export async function deleteApplication(applicationId: string) {
  const linked = await all<{ id: string; status: string }>(
    "SELECT id, status FROM opportunities WHERE application_id = ?",
    [applicationId]
  );
  const now = nowIso();
  await run(
    `UPDATE opportunities
     SET application_id = NULL,
         status = CASE WHEN status = 'promoted' THEN 'draft_ready' ELSE status END,
         updated_at = ?
     WHERE application_id = ?`,
    [now, applicationId]
  );
  for (const row of linked) {
    await run(
      `INSERT INTO opportunity_events (id, opportunity_id, type, message, created_at)
       VALUES (?, ?, 'unlinked', ?, ?)`,
      [
        id(),
        row.id,
        row.status === "promoted"
          ? "Linked application was deleted. Status returned to draft ready."
          : "Linked application was deleted.",
        now,
      ]
    );
  }
  await run("DELETE FROM applications WHERE id = ?", [applicationId]);
}

export async function listContacts(applicationId: string): Promise<Contact[]>;
export async function listContacts(): Promise<ContactWithApp[]>;
export async function listContacts(
  applicationId?: string
): Promise<Contact[] | ContactWithApp[]> {
  if (applicationId) {
    return all<Contact>(
      "SELECT * FROM contacts WHERE application_id = ? ORDER BY created_at DESC",
      [applicationId]
    );
  }
  return all<ContactWithApp>(
    `SELECT c.*, a.company, a.role
     FROM contacts c
     JOIN applications a ON a.id = c.application_id
     ORDER BY c.created_at DESC`
  );
}

export async function insertContact(
  applicationId: string,
  input: {
    name: string;
    title?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedin_url?: string | null;
    notes?: string | null;
  }
) {
  const contactId = id();
  await run(
    `INSERT INTO contacts (
      id, application_id, name, title, email, phone, linkedin_url, notes, created_at
    ) VALUES (
      @id, @application_id, @name, @title, @email, @phone, @linkedin_url, @notes, @created_at
    )`,
    {
      id: contactId,
      application_id: applicationId,
      name: input.name,
      title: emptyToNull(input.title),
      email: emptyToNull(input.email),
      phone: emptyToNull(input.phone),
      linkedin_url: emptyToNull(input.linkedin_url),
      notes: emptyToNull(input.notes),
      created_at: nowIso(),
    }
  );
  await addActivity(applicationId, "contact_added", `Contact added: ${input.name}`);
  await touchApplication(applicationId);
  return contactId;
}

export async function deleteContact(contactId: string) {
  const row = await get<Contact>("SELECT * FROM contacts WHERE id = ?", [contactId]);
  if (!row) return;
  await run("DELETE FROM contacts WHERE id = ?", [contactId]);
  await addActivity(row.application_id, "contact_removed", `Contact removed: ${row.name}`);
  await touchApplication(row.application_id);
}

export async function listFollowUps(applicationId: string) {
  return all<FollowUp>(
    `SELECT * FROM follow_ups
     WHERE application_id = ?
     ORDER BY completed_at IS NULL DESC, due_at ASC`,
    [applicationId]
  );
}

export async function insertFollowUp(
  applicationId: string,
  dueAt: string,
  note?: string | null,
  options?: { silent?: boolean }
) {
  const followUpId = id();
  await run(
    `INSERT INTO follow_ups (id, application_id, due_at, completed_at, note, created_at)
     VALUES (@id, @application_id, @due_at, NULL, @note, @created_at)`,
    {
      id: followUpId,
      application_id: applicationId,
      due_at: dueAt,
      note: emptyToNull(note),
      created_at: nowIso(),
    }
  );
  if (!options?.silent) {
    await addActivity(
      applicationId,
      "follow_up_created",
      `Follow-up scheduled for ${dueAt}`
    );
    await touchApplication(applicationId);
  }
  return followUpId;
}

export async function completeFollowUp(followUpId: string) {
  const row = await get<FollowUp>("SELECT * FROM follow_ups WHERE id = ?", [
    followUpId,
  ]);
  if (!row || row.completed_at) return;
  await run("UPDATE follow_ups SET completed_at = ? WHERE id = ?", [
    nowIso(),
    followUpId,
  ]);
  await addActivity(
    row.application_id,
    "follow_up_completed",
    `Follow-up completed (${row.due_at})`
  );
  await touchApplication(row.application_id);
}

export async function deleteFollowUp(followUpId: string) {
  const row = await get<FollowUp>("SELECT * FROM follow_ups WHERE id = ?", [
    followUpId,
  ]);
  if (!row) return;
  await run("DELETE FROM follow_ups WHERE id = ?", [followUpId]);
  await addActivity(row.application_id, "follow_up_removed", "Follow-up removed");
  await touchApplication(row.application_id);
}

export async function listOpenFollowUps() {
  return all<FollowUpWithApp>(
    `SELECT f.*, a.company, a.role, a.status
     FROM follow_ups f
     JOIN applications a ON a.id = f.application_id
     WHERE f.completed_at IS NULL
     ORDER BY f.due_at ASC`
  );
}

export function bucketFollowUps(items: FollowUpWithApp[]) {
  const today = todayIso();
  const week = addDaysIso(7);
  const overdue: FollowUpWithApp[] = [];
  const dueToday: FollowUpWithApp[] = [];
  const weekItems: FollowUpWithApp[] = [];
  const later: FollowUpWithApp[] = [];

  for (const item of items) {
    if (item.due_at < today) overdue.push(item);
    else if (item.due_at === today) dueToday.push(item);
    else if (item.due_at <= week) weekItems.push(item);
    else later.push(item);
  }

  return { overdue, today: dueToday, week: weekItems, later };
}

export async function listActivities(applicationId: string) {
  return all<Activity>(
    "SELECT * FROM activities WHERE application_id = ? ORDER BY created_at DESC",
    [applicationId]
  );
}

export async function listRecentActivity(limit = 8) {
  return all<ActivityWithApp>(
    `SELECT act.*, a.company, a.role
     FROM activities act
     JOIN applications a ON a.id = act.application_id
     ORDER BY act.created_at DESC
     LIMIT ?`,
    [limit]
  );
}

export async function addActivity(
  applicationId: string,
  type: string,
  message: string
) {
  await run(
    `INSERT INTO activities (id, application_id, type, message, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id(), applicationId, type, message, nowIso()]
  );
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const terminal = ["accepted", "rejected", "withdrawn", "ghosted"];
  const weekAgo = addDaysIso(-7);
  const [
    totalRow,
    activeRow,
    appliedThisWeekRow,
    overdueFollowUpsRow,
    interviewsRow,
    offersRow,
    sampleCount,
  ] = await Promise.all([
    get<{ n: number }>("SELECT COUNT(*) AS n FROM applications"),
    get<{ n: number }>(
      `SELECT COUNT(*) AS n FROM applications WHERE status NOT IN (${terminal
        .map(() => "?")
        .join(",")})`,
      terminal
    ),
    get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM applications WHERE applied_at IS NOT NULL AND applied_at >= ?",
      [weekAgo]
    ),
    get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM follow_ups WHERE completed_at IS NULL AND due_at < ?",
      [todayIso()]
    ),
    get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM applications WHERE status = 'interview'"
    ),
    get<{ n: number }>(
      "SELECT COUNT(*) AS n FROM applications WHERE status = 'offer'"
    ),
    countSampleApplications(),
  ]);

  return {
    total: totalRow?.n ?? 0,
    active: activeRow?.n ?? 0,
    appliedThisWeek: appliedThisWeekRow?.n ?? 0,
    overdueFollowUps: overdueFollowUpsRow?.n ?? 0,
    interviews: interviewsRow?.n ?? 0,
    offers: offersRow?.n ?? 0,
    sampleCount,
  };
}

export async function getAtsCounts(limit = 8): Promise<AtsCount[]> {
  const rows = await all<{ ats: string | null; n: number }>(
    `SELECT COALESCE(NULLIF(ats, ''), 'unknown') AS ats, COUNT(*) AS n
     FROM applications
     GROUP BY COALESCE(NULLIF(ats, ''), 'unknown')
     ORDER BY n DESC, ats ASC
     LIMIT ?`,
    [limit]
  );
  return rows.map((row) => ({
    ats: isAts(row.ats ?? "") ? (row.ats as AtsVendor) : "unknown",
    count: row.n,
  }));
}

export async function getPipelineCounts() {
  const rows = await all<{ status: Status; n: number }>(
    "SELECT status, COUNT(*) AS n FROM applications GROUP BY status"
  );
  const map = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<
    Record<Status, number>
  >;
  return PIPELINE_STATUSES.map((status) => ({
    status,
    count: map[status] ?? 0,
  }));
}

export async function clearSampleData() {
  await run("DELETE FROM applications WHERE is_sample = 1");
}

async function maybeAutoFollowUp(
  applicationId: string,
  previous: Status | undefined,
  next: Status
) {
  if (next !== "applied") return;
  if (previous === "applied") return;
  const open = await get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM follow_ups WHERE application_id = ? AND completed_at IS NULL",
    [applicationId]
  );
  if ((open?.n ?? 0) > 0) return;
  await insertFollowUp(
    applicationId,
    addDaysIso(7),
    "Auto follow-up · 7 days after Applied",
    { silent: true }
  );
  await addActivity(
    applicationId,
    "follow_up_created",
    "Auto follow-up scheduled for 7 days after Applied"
  );
}

async function touchApplication(applicationId: string) {
  await run("UPDATE applications SET updated_at = ? WHERE id = ?", [
    nowIso(),
    applicationId,
  ]);
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isSavedLike(status: Status) {
  return status === "saved";
}

export async function hasOpenFollowUp(applicationId: string) {
  const row = await get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM follow_ups WHERE application_id = ? AND completed_at IS NULL",
    [applicationId]
  );
  return (row?.n ?? 0) > 0;
}
