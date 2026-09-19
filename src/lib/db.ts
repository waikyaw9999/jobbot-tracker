import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import fs from "node:fs";
import path from "node:path";
import {
  createClient,
  type Client,
  type InArgs,
  type ResultSet,
  type Transaction,
} from "@libsql/client";

const DB_PATH = path.join(process.cwd(), "data", "jobbot.sqlite");

type LibsqlConnection =
  | { kind: "remote"; url: string; authToken?: string }
  | { kind: "file"; url: string; filePath: string };

type Executor = Pick<Client, "execute">;
type GlobalDb = typeof globalThis & {
  __jobbotDb?: Client;
  __jobbotDbInit?: Promise<Client>;
};

const txStorage = new AsyncLocalStorage<Transaction>();

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  platform TEXT NOT NULL,
  ats TEXT,
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
CREATE INDEX IF NOT EXISTS idx_applications_ats ON applications(ats);
CREATE INDEX IF NOT EXISTS idx_applications_updated ON applications(updated_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due ON follow_ups(due_at);
CREATE INDEX IF NOT EXISTS idx_follow_ups_app ON follow_ups(application_id);
CREATE INDEX IF NOT EXISTS idx_contacts_app ON contacts(application_id);
CREATE INDEX IF NOT EXISTS idx_activities_app ON activities(application_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at);
`;

function sqliteFileUrl(filePath: string) {
  const absolute = path.resolve(filePath).replace(/\\/g, "/");
  if (/^[A-Za-z]:\//.test(absolute)) {
    return `file:///${absolute}`;
  }
  return `file:${absolute}`;
}

function envValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function isRemoteLibsqlUrl(url: string) {
  return /^(libsql|https?):\/\//i.test(url);
}

function isServerlessRuntime() {
  return Boolean(process.env.VERCEL);
}

function resolveLibsqlConnection(): LibsqlConnection {
  const url = envValue("LIBSQL_URL", "TURSO_DATABASE_URL");
  const authToken = envValue("LIBSQL_AUTH_TOKEN", "TURSO_AUTH_TOKEN");

  if (url && isRemoteLibsqlUrl(url)) {
    return { kind: "remote", url, authToken };
  }

  if (isServerlessRuntime()) {
    throw new Error(
      "Remote libSQL is required on Vercel. Set TURSO_DATABASE_URL (or LIBSQL_URL) and TURSO_AUTH_TOKEN (or LIBSQL_AUTH_TOKEN). Local file SQLite cannot persist on the serverless filesystem."
    );
  }

  return { kind: "file", url: sqliteFileUrl(DB_PATH), filePath: DB_PATH };
}

async function migrate(db: Client, kind: LibsqlConnection["kind"]) {
  // WAL is a local-file journal mode; skip it on Turso / remote libSQL.
  if (kind === "file") {
    await db.execute("PRAGMA journal_mode = WAL");
  }
  await db.execute("PRAGMA foreign_keys = ON");
  await db.executeMultiple(SCHEMA_SQL);
  await ensureColumn(db, "applications", "ats", "TEXT");
}

async function ensureColumn(
  db: Client,
  table: string,
  column: string,
  definition: string
) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  const exists = info.rows.some((row) => {
    const name = (row as { name?: unknown }).name ?? row[1];
    return String(name) === column;
  });
  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function initDb() {
  const connection = resolveLibsqlConnection();
  if (connection.kind === "file") {
    fs.mkdirSync(path.dirname(connection.filePath), { recursive: true });
  }

  const db = createClient(
    connection.kind === "remote"
      ? { url: connection.url, authToken: connection.authToken }
      : { url: connection.url }
  );
  await migrate(db, connection.kind);
  return db;
}

export async function getDb() {
  const g = globalThis as GlobalDb;
  if (g.__jobbotDb) return g.__jobbotDb;
  if (!g.__jobbotDbInit) {
    g.__jobbotDbInit = initDb()
      .then((db) => {
        g.__jobbotDb = db;
        return db;
      })
      .catch((error) => {
        g.__jobbotDbInit = undefined;
        throw error;
      });
  }
  return g.__jobbotDbInit;
}

async function getExecutor(): Promise<Executor> {
  return txStorage.getStore() ?? (await getDb());
}

function mapRows<T>(result: ResultSet): T[] {
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (const column of result.columns) {
      const value = row[column];
      obj[column] = typeof value === "bigint" ? Number(value) : value;
    }
    return obj as T;
  });
}

export async function run(sql: string, args?: InArgs) {
  const db = await getExecutor();
  return args === undefined ? db.execute(sql) : db.execute({ sql, args });
}

export async function all<T>(sql: string, args?: InArgs): Promise<T[]> {
  return mapRows<T>(await run(sql, args));
}

export async function get<T>(sql: string, args?: InArgs): Promise<T | undefined> {
  const rows = await all<T>(sql, args);
  return rows[0];
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const db = await getDb();
  const tx = await db.transaction("write");
  try {
    const result = await txStorage.run(tx, fn);
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback().catch(() => undefined);
    throw error;
  }
}
