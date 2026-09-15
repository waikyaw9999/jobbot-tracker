# JobBot Tracker

Local-first job-search tracker. Applications, follow-ups, contacts, and an activity timeline live in a SQLite file on your machine — no cloud account, no telemetry.

## Features

- **Applications CRUD** across LinkedIn, Indeed, Glassdoor, Wellfound, Handshake, Greenhouse, Lever, email, referral, and Other
- **Status pipeline:** Saved → Applied → Recruiter screen → Hiring manager → Interview → Offer, plus Accepted / Rejected / Withdrawn / Ghosted
- **Follow-ups** grouped as overdue / today / this week / later. Moving a role to **Applied** schedules a 7-day follow-up when none is open
- **Contacts** per application (recruiter, hiring manager, referral)
- **Activity timeline** for status changes, notes, follow-ups, contacts, and imports
- **Dashboard** with pipeline counts, KPIs, and recent activity
- **CSV import / export**
- **Dark mode**
- **SAMPLE seed data** with a one-click clear-sample path (sample rows are tagged and never mixed into your own data when you clear them)

## Setup

Requires **Node.js 20 or 22 LTS** (recommended). Node 24 also works. You do **not** need Visual Studio, Python, or C++ build tools.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run dev` uses **Webpack**. Next.js 16 defaults to Turbopack; Webpack is used here so HMR does not break hydration. To try Turbopack: `npm run dev:turbo`.

Production build:

```bash
npm run build
npm start
```

No `.env` is required. The database is created automatically at `data/jobbot.sqlite` on first run.

### Windows

`npm install` does not compile native addons. SQLite comes from `@libsql/client`, which ships prebuilt binaries (no `node-gyp`, no “Desktop development with C++” workload).

If `npm install` fails while cleaning `node_modules` (`EPERM` / file locked), close any running Node or Next.js processes, delete the `node_modules` folder, and run `npm install` again.

Prefer Node 20 or 22 LTS over Node 24 if you can. This app does not need Node 24, and LTS is the smoother path for most Windows setups.

## Data

| Path | Purpose |
| --- | --- |
| `data/jobbot.sqlite` | File SQLite database (gitignored) |
| `data/.gitkeep` | Keeps the folder in git |

`.gitignore` excludes `node_modules/`, `.next/`, `.env*`, `data/*.sqlite`, `data/*.sqlite-*`, `data/*.db`, `*.sqlite-wal`, and `*.sqlite-shm`.

### SAMPLE data

On an empty board, **Load SAMPLE data** inserts 12 fictional applications across platforms and pipeline stages, including overdue / today / this-week follow-ups. They are marked `SAMPLE`. **Clear SAMPLE data** deletes only those rows.

### CSV

Export from **Import / Export**, or `GET /api/export`.

Columns:

```
company,role,platform,status,location,job_url,salary_min,salary_max,notes,applied_at
```

`company` and `role` are required. Platform and status values match the app (lowercase, underscores: `recruiter_screen`, `hiring_manager`, `linkedin`, `greenhouse`, …).

## Stack

Next.js App Router · TypeScript · Tailwind CSS · shadcn/ui · `@libsql/client` (local SQLite file)
