import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const DB_PATH = path.join(process.cwd(), "data", "jobbot.sqlite");

type GlobalDb = typeof globalThis & {
  __jobbotDb?: Database.Database;
};

function migrate(db: Database.Database) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      platform TEXT NOT NULL,
      status TEXT NOT NULL,
      location TEXT,
      job_url TEXT,
      salary_min INTEGER,
      salary_max INTEGER,
      notes TEXT,
      applied_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_sample INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      email TEXT,
      phone TEXT,
      linkedin_url TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      due_at TEXT NOT NULL,
      completed_at TEXT,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_platform ON applications(platform);
    CREATE INDEX IF NOT EXISTS idx_applications_updated ON applications(updated_at);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_due ON follow_ups(due_at);
    CREATE INDEX IF NOT EXISTS idx_follow_ups_app ON follow_ups(application_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_app ON contacts(application_id);
    CREATE INDEX IF NOT EXISTS idx_activities_app ON activities(application_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
  `);
}

export function getDb() {
  const g = globalThis as GlobalDb;
  if (!g.__jobbotDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    g.__jobbotDb = db;
  }
  return g.__jobbotDb;
}
