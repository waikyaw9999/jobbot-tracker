import "server-only";

import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import {
  isTerminal,
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
  Contact,
  ContactWithApp,
  DashboardStats,
  FollowUp,
  FollowUpWithApp,
} from "@/lib/types";

function id() {
  return randomUUID();
}

export function listApplications(filters?: {
  q?: string;
  status?: Status | "all";
  platform?: Platform | "all";
}) {
  const db = getDb();
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

  const sql = `SELECT * FROM applications ${
    where.length ? `WHERE ${where.join(" AND ")}` : ""
  } ORDER BY updated_at DESC`;

  return db.prepare(sql).all(params) as Application[];
}

export function getApplication(applicationId: string) {
  return getDb()
    .prepare("SELECT * FROM applications WHERE id = ?")
    .get(applicationId) as Application | undefined;
}

export function countSampleApplications() {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM applications WHERE is_sample = 1")
    .get() as { n: number };
  return row.n;
}

export function insertApplication(
  input: ApplicationInput,
  options?: { isSample?: boolean; skipAutoFollowUp?: boolean }
) {
  const db = getDb();
  const now = nowIso();
  const applicationId = id();
  const status = input.status;
  const appliedAt =
    input.applied_at ?? (status === "applied" || !isSavedLike(status) ? todayIso() : null);

  db.prepare(
    `INSERT INTO applications (
      id, company, role, platform, status, location, job_url,
      salary_min, salary_max, notes, applied_at, created_at, updated_at, is_sample
    ) VALUES (
      @id, @company, @role, @platform, @status, @location, @job_url,
      @salary_min, @salary_max, @notes, @applied_at, @created_at, @updated_at, @is_sample
    )`
  ).run({
    id: applicationId,
    company: input.company,
    role: input.role,
    platform: input.platform,
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
  });

  addActivity(
    applicationId,
    "created",
    `Added ${input.role} at ${input.company} · ${statusLabel(status)}`
  );

  if (!options?.skipAutoFollowUp) {
    maybeAutoFollowUp(applicationId, undefined, status);
  }

  return applicationId;
}

export function updateApplication(applicationId: string, input: ApplicationInput) {
  const existing = getApplication(applicationId);
  if (!existing) throw new Error("Application not found");

  const db = getDb();
  const now = nowIso();
  const appliedAt =
    input.applied_at ??
    existing.applied_at ??
    (input.status === "applied" ? todayIso() : null);

  db.prepare(
    `UPDATE applications SET
      company = @company,
      role = @role,
      platform = @platform,
      status = @status,
      location = @location,
      job_url = @job_url,
      salary_min = @salary_min,
      salary_max = @salary_max,
      notes = @notes,
      applied_at = @applied_at,
      updated_at = @updated_at
    WHERE id = @id`
  ).run({
    id: applicationId,
    company: input.company,
    role: input.role,
    platform: input.platform,
    status: input.status,
    location: emptyToNull(input.location),
    job_url: emptyToNull(input.job_url),
    salary_min: input.salary_min ?? null,
    salary_max: input.salary_max ?? null,
    notes: emptyToNull(input.notes),
    applied_at: emptyToNull(appliedAt),
    updated_at: now,
  });

  if (existing.status !== input.status) {
    addActivity(
      applicationId,
      "status_changed",
      `Status ${statusLabel(existing.status)} → ${statusLabel(input.status)}`
    );
    maybeAutoFollowUp(applicationId, existing.status, input.status);
  } else {
    addActivity(applicationId, "updated", "Application details updated");
  }
}

export function updateApplicationStatus(applicationId: string, status: Status) {
  const existing = getApplication(applicationId);
  if (!existing) throw new Error("Application not found");
  if (existing.status === status) return;

  const now = nowIso();
  const appliedAt =
    existing.applied_at ?? (status === "applied" ? todayIso() : existing.applied_at);

  getDb()
    .prepare(
      `UPDATE applications
       SET status = @status, applied_at = @applied_at, updated_at = @updated_at
       WHERE id = @id`
    )
    .run({
      id: applicationId,
      status,
      applied_at: appliedAt,
      updated_at: now,
    });

  addActivity(
    applicationId,
    "status_changed",
    `Status ${statusLabel(existing.status)} → ${statusLabel(status)}`
  );
  maybeAutoFollowUp(applicationId, existing.status, status);
}

export function deleteApplication(applicationId: string) {
  getDb().prepare("DELETE FROM applications WHERE id = ?").run(applicationId);
}

export function listContacts(applicationId?: string) {
  const db = getDb();
  if (applicationId) {
    return db
      .prepare(
        "SELECT * FROM contacts WHERE application_id = ? ORDER BY created_at DESC"
      )
      .all(applicationId) as Contact[];
  }
  return db
    .prepare(
      `SELECT c.*, a.company, a.role
       FROM contacts c
       JOIN applications a ON a.id = c.application_id
       ORDER BY c.created_at DESC`
    )
    .all() as ContactWithApp[];
}

export function insertContact(
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
  getDb()
    .prepare(
      `INSERT INTO contacts (
        id, application_id, name, title, email, phone, linkedin_url, notes, created_at
      ) VALUES (
        @id, @application_id, @name, @title, @email, @phone, @linkedin_url, @notes, @created_at
      )`
    )
    .run({
      id: contactId,
      application_id: applicationId,
      name: input.name,
      title: emptyToNull(input.title),
      email: emptyToNull(input.email),
      phone: emptyToNull(input.phone),
      linkedin_url: emptyToNull(input.linkedin_url),
      notes: emptyToNull(input.notes),
      created_at: nowIso(),
    });
  addActivity(applicationId, "contact_added", `Contact added: ${input.name}`);
  touchApplication(applicationId);
  return contactId;
}

export function deleteContact(contactId: string) {
  const row = getDb()
    .prepare("SELECT * FROM contacts WHERE id = ?")
    .get(contactId) as Contact | undefined;
  if (!row) return;
  getDb().prepare("DELETE FROM contacts WHERE id = ?").run(contactId);
  addActivity(row.application_id, "contact_removed", `Contact removed: ${row.name}`);
  touchApplication(row.application_id);
}

export function listFollowUps(applicationId: string) {
  return getDb()
    .prepare(
      `SELECT * FROM follow_ups
       WHERE application_id = ?
       ORDER BY completed_at IS NULL DESC, due_at ASC`
    )
    .all(applicationId) as FollowUp[];
}

export function insertFollowUp(
  applicationId: string,
  dueAt: string,
  note?: string | null,
  options?: { silent?: boolean }
) {
  const followUpId = id();
  getDb()
    .prepare(
      `INSERT INTO follow_ups (id, application_id, due_at, completed_at, note, created_at)
       VALUES (@id, @application_id, @due_at, NULL, @note, @created_at)`
    )
    .run({
      id: followUpId,
      application_id: applicationId,
      due_at: dueAt,
      note: emptyToNull(note),
      created_at: nowIso(),
    });
  if (!options?.silent) {
    addActivity(
      applicationId,
      "follow_up_created",
      `Follow-up scheduled for ${dueAt}`
    );
    touchApplication(applicationId);
  }
  return followUpId;
}

export function completeFollowUp(followUpId: string) {
  const row = getDb()
    .prepare("SELECT * FROM follow_ups WHERE id = ?")
    .get(followUpId) as FollowUp | undefined;
  if (!row || row.completed_at) return;
  getDb()
    .prepare("UPDATE follow_ups SET completed_at = ? WHERE id = ?")
    .run(nowIso(), followUpId);
  addActivity(
    row.application_id,
    "follow_up_completed",
    `Follow-up completed (${row.due_at})`
  );
  touchApplication(row.application_id);
}

export function deleteFollowUp(followUpId: string) {
  const row = getDb()
    .prepare("SELECT * FROM follow_ups WHERE id = ?")
    .get(followUpId) as FollowUp | undefined;
  if (!row) return;
  getDb().prepare("DELETE FROM follow_ups WHERE id = ?").run(followUpId);
  addActivity(row.application_id, "follow_up_removed", "Follow-up removed");
  touchApplication(row.application_id);
}

export function listOpenFollowUps() {
  return getDb()
    .prepare(
      `SELECT f.*, a.company, a.role, a.status
       FROM follow_ups f
       JOIN applications a ON a.id = f.application_id
       WHERE f.completed_at IS NULL
       ORDER BY f.due_at ASC`
    )
    .all() as FollowUpWithApp[];
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

export function listActivities(applicationId: string) {
  return getDb()
    .prepare(
      "SELECT * FROM activities WHERE application_id = ? ORDER BY created_at DESC"
    )
    .all(applicationId) as Activity[];
}

export function listRecentActivity(limit = 8) {
  return getDb()
    .prepare(
      `SELECT act.*, a.company, a.role
       FROM activities act
       JOIN applications a ON a.id = act.application_id
       ORDER BY act.created_at DESC
       LIMIT ?`
    )
    .all(limit) as ActivityWithApp[];
}

export function addActivity(
  applicationId: string,
  type: string,
  message: string
) {
  getDb()
    .prepare(
      `INSERT INTO activities (id, application_id, type, message, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(id(), applicationId, type, message, nowIso());
}

export function getDashboardStats(): DashboardStats {
  const db = getDb();
  const total = (db.prepare("SELECT COUNT(*) AS n FROM applications").get() as {
    n: number;
  }).n;
  const terminal = ["accepted", "rejected", "withdrawn", "ghosted"];
  const active = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM applications WHERE status NOT IN (${terminal
          .map(() => "?")
          .join(",")})`
      )
      .get(...terminal) as { n: number }
  ).n;
  const weekAgo = addDaysIso(-7);
  const appliedThisWeek = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM applications WHERE applied_at IS NOT NULL AND applied_at >= ?"
      )
      .get(weekAgo) as { n: number }
  ).n;
  const overdueFollowUps = (
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM follow_ups WHERE completed_at IS NULL AND due_at < ?"
      )
      .get(todayIso()) as { n: number }
  ).n;
  const interviews = (
    db
      .prepare("SELECT COUNT(*) AS n FROM applications WHERE status = 'interview'")
      .get() as { n: number }
  ).n;
  const offers = (
    db
      .prepare("SELECT COUNT(*) AS n FROM applications WHERE status = 'offer'")
      .get() as { n: number }
  ).n;
  const sampleCount = countSampleApplications();
  return {
    total,
    active,
    appliedThisWeek,
    overdueFollowUps,
    interviews,
    offers,
    sampleCount,
  };
}

export function getPipelineCounts() {
  const rows = getDb()
    .prepare("SELECT status, COUNT(*) AS n FROM applications GROUP BY status")
    .all() as { status: Status; n: number }[];
  const map = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<
    Record<Status, number>
  >;
  return PIPELINE_STATUSES.map((status) => ({
    status,
    count: map[status] ?? 0,
  }));
}

export function clearSampleData() {
  getDb().prepare("DELETE FROM applications WHERE is_sample = 1").run();
}

function maybeAutoFollowUp(
  applicationId: string,
  previous: Status | undefined,
  next: Status
) {
  if (next !== "applied") return;
  if (previous === "applied") return;
  const open = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM follow_ups WHERE application_id = ? AND completed_at IS NULL"
    )
    .get(applicationId) as { n: number };
  if (open.n > 0) return;
  insertFollowUp(
    applicationId,
    addDaysIso(7),
    "Auto follow-up · 7 days after Applied",
    { silent: true }
  );
  addActivity(
    applicationId,
    "follow_up_created",
    "Auto follow-up scheduled for 7 days after Applied"
  );
}

function touchApplication(applicationId: string) {
  getDb()
    .prepare("UPDATE applications SET updated_at = ? WHERE id = ?")
    .run(nowIso(), applicationId);
}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isSavedLike(status: Status) {
  return status === "saved";
}

export function hasOpenFollowUp(applicationId: string) {
  const row = getDb()
    .prepare(
      "SELECT COUNT(*) AS n FROM follow_ups WHERE application_id = ? AND completed_at IS NULL"
    )
    .get(applicationId) as { n: number };
  return row.n > 0;
}
