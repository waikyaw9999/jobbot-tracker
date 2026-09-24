# JobBot Tracker

Local-first job-search tracker. Applications, follow-ups, contacts, and an activity timeline live in a SQLite file on your machine — no cloud account, no telemetry. Optional free hosted deploy: Vercel Hobby + Turso libSQL.

## Features

- **Opportunities inbox** — capture roles before you apply: status (`new`, `worth a look`, `draft ready`, `skipped`, `promoted`), visa note, fit, source, and a cover-letter draft. **Promote to application** creates a Saved row in the pipeline and links it. JobBot never auto-applies and never sends email
- **Assist profile** — editable search preferences (titles, exclude keywords, markets, preferred sources, stack keywords, cover-letter tone). Seeded for a senior full-stack / tech-lead search across Singapore, Thailand, and Australia (visa sponsor), including LinkedIn, JobStreet, JobsDB, Indeed, Jaabz, Ashby, and Michael Page
- **Digest import and URL add** — paste or upload a markdown table / CSV (status, role, company, location, source, visa, fit, url, optional cover letter). Duplicates are skipped. Pasting a listing URL pre-fills source and ATS from the host. Fit hints are local keyword overlap — no model API key
- **Applications CRUD** across global job boards (LinkedIn, Indeed, Seek, StepStone, Reed, Bayt, JobsDB, JobStreet, Jaabz, Michael Page, Welcome to the Jungle, and more) plus email, referral, Ashby, and company career sites
- **ATS tagging** — record which applicant-tracking vendor you actually applied through (Greenhouse, Workday, Lever, Ashby, Personio, Taleo, SuccessFactors, …), separate from the job-board *source*. Includes Unknown / Other / company career site / email-referral. Known portal URLs (for example `boards.greenhouse.io`, `*.myworkdayjobs.com`, `jobs.lever.co`) pre-fill the ATS; you can always override
- **Status pipeline:** Saved → Applied → Recruiter screen → Hiring manager → Interview → Offer, plus Accepted / Rejected / Withdrawn / Ghosted. List and kanban-style **board** views
- **Follow-ups** grouped as overdue / today / this week / later. Moving a role to **Applied** schedules a 7-day follow-up when none is open
- **Contacts** per application (recruiter, hiring manager, referral)
- **Activity timeline** for status changes, notes, follow-ups, contacts, and imports
- **Dashboard** with opportunity counts (new, draft ready, worth a look), pipeline counts, top ATS used, KPIs, and recent activity
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

No `.env` is required for local development. The database is created automatically at `data/jobbot.sqlite` on first run. To point at a remote Turso / libSQL database instead, copy `.env.example` and set the URL + token (see [Deploy free (Vercel + Turso)](#deploy-free-vercel--turso)).

### Windows

`npm install` does not compile native addons. SQLite comes from `@libsql/client`, which ships prebuilt binaries (no `node-gyp`, no “Desktop development with C++” workload).

If `npm install` fails while cleaning `node_modules` (`EPERM` / file locked), close any running Node or Next.js processes, delete the `node_modules` folder, and run `npm install` again.

Prefer Node 20 or 22 LTS over Node 24 if you can. This app does not need Node 24, and LTS is the smoother path for most Windows setups.

## Data

| Path | Purpose |
| --- | --- |
| `data/jobbot.sqlite` | Local file SQLite database (gitignored). Unused when a remote `TURSO_DATABASE_URL` / `LIBSQL_URL` is set. |
| `data/.gitkeep` | Keeps the folder in git |
| `.env.example` | Documents remote libSQL env var names (no secrets) |

`.gitignore` excludes `node_modules/`, `.next/`, `.env*` (except `.env.example`), `data/*.sqlite`, `data/*.sqlite-*`, `data/*.db`, `*.sqlite-wal`, and `*.sqlite-shm`.

Existing databases pick up the optional `ats` column on next launch (`ALTER TABLE` if missing). Older rows stay `NULL` / Unknown until you edit them. The same launch creates `opportunities` and `search_preferences` if they are missing (`CREATE TABLE IF NOT EXISTS`). The Assist profile is inserted the first time preferences are read, and you can edit or reset it under **Opportunities → Assist profile**.

## Opportunities and Assist

Open **Opportunities** to triage roles the way a daily job-alert digest does: research and cover-letter drafts only. This version stays on your machine (or Turso). It does not log into Gmail, scrape boards, or send anything.

1. Review **Assist profile**. Markets default to Thailand, Singapore, and Australia. Set keywords, exclude keywords, minimum seniority, and the Australia sponsorship toggle. “Never invent email” stays on.
2. **Add opportunity** and paste a LinkedIn, JobStreet, JobsDB, Indeed, Jaabz, Ashby, Greenhouse, or Michael Page URL. The source and ATS fill in when the host is recognized. Type the role and company yourself — v1 does not scrape listings. Market, seniority, tech tags, sponsorship, and an optional contact can be filled in on the same form.
3. **Suggest** fit (Excellent / Strong / Good / Stretch) from title and stack overlap. Roles under your minimum seniority, or Australian roles with sponsorship marked no while that toggle is on, score as Stretch. **Import digest** accepts a markdown table or CSV from JobAlertsWatch. Rows are skipped when the normalized company + title or source URL already exists on an opportunity or an application. An imported email is stored only when the row marks it verified.
4. Triage with Portal only, Draft ready, or Skip (optional skip reason). Worth a look and Closed are on the detail page. **Promote to application** creates a **Saved** application and sets the opportunity to `promoted`. The cover letter is stored as an in-app draft you can copy. It is not placed in Gmail.

Contacts accept only an address you type or a verified import. Unverified addresses are dropped on import and are not copied into the draft recipient.

Later, outside this version: create a Gmail draft from a stored letter. Still out of scope: auto-send, inventing emails, live board scrapes behind Cloudflare, Google Doc upload, a Michael Page session, and the Gmail API.

No Gmail, LinkedIn, or other API keys are required.

### SAMPLE data

On an empty board, **Load SAMPLE data** inserts fictional applications across US, EU, APAC, and MENA sources and ATS vendors, including overdue / today / this-week follow-ups. They are marked `SAMPLE`. **Clear SAMPLE data** deletes only those rows.

### CSV

Export from **Import / Export**, or `GET /api/export`.

Columns:

```
company,role,platform,ats,status,location,job_url,salary_min,salary_max,notes,applied_at
```

`company` and `role` are required. `ats` is optional — older CSVs without that column still import. You can also send `ats_vendor`. Empty ATS values are inferred from a known portal URL, or from sources such as `greenhouse` / `lever` / `email` / `referral`, otherwise stored as `unknown`.

Platform and status values match the app (lowercase, underscores: `recruiter_screen`, `hiring_manager`, `linkedin`, `seek`, `stepstone`, `bayt`, …). ATS slugs include `greenhouse`, `workday`, `personio`, `career_site`, `email_referral`, and `unknown`.

## Deploy free (Vercel + Turso)

Vercel’s filesystem is ephemeral, so the local `data/jobbot.sqlite` file cannot persist in production. Use Turso’s free-tier libSQL database instead — it speaks the same `@libsql/client` API. You must create the Turso and Vercel accounts yourself; this repo does not provision them.

### 1. Create a free Turso database

Sign up at [turso.tech](https://turso.tech) (Starter / Free). In the [dashboard](https://app.turso.tech) create a database (for example `jobbot`), then create a database token.

Or with the [Turso CLI](https://docs.turso.tech/cli):

```bash
turso auth login
turso db create jobbot
turso db show jobbot --url
turso db tokens create jobbot
```

Copy the `libsql://…` URL and the auth token. Do not commit the token.

### 2. Set env vars and deploy on Vercel Hobby

1. Import the GitHub repo [`waikyaw9999/jobbot-tracker`](https://github.com/waikyaw9999/jobbot-tracker) at [vercel.com/new](https://vercel.com/new).
2. In the Vercel project, add **Environment Variables** (Production and Preview):

   | Name | Required | Example |
   | --- | --- | --- |
   | `TURSO_DATABASE_URL` | one of this or `LIBSQL_URL` | `libsql://jobbot-<org>.turso.io` |
   | `TURSO_AUTH_TOKEN` | one of this or `LIBSQL_AUTH_TOKEN` | the token from step 1 |
   | `LIBSQL_URL` | alias for `TURSO_DATABASE_URL` | same URL |
   | `LIBSQL_AUTH_TOKEN` | alias for `TURSO_AUTH_TOKEN` | same token |

3. Deploy. Framework preset: Next.js. Node **20** or **22**. No build command override is needed (`npm run build`).
4. Open the deployment URL. Tables and indexes are created on the **first request** (serverless cold start runs `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`).

Local `npm run dev` with these vars unset still uses `data/jobbot.sqlite`.

### 3. Free-tier limits (honest)

- **Vercel Hobby** is free for a personal project. Serverless functions sleep after idle time, so the first hit after a break can take a second or two (cold start). Usage caps apply (invocations, bandwidth); see [Vercel Hobby limits](https://vercel.com/docs/accounts/plans/hobby).
- **Turso Free** is enough for a single-user job tracker (as of Turso’s published Free plan: on the order of 100 databases, 5 GB storage, hundreds of millions of row reads / tens of millions of writes per month). Quotas change — confirm [turso.tech/pricing](https://turso.tech/pricing). Exceeding a free-plan metric can block the database until the next cycle or an upgrade.
- This is one person’s tracker, not a multi-tenant host. There is no paid Neon / Railway / PlanetScale requirement.

## Stack

Next.js App Router · TypeScript · Tailwind CSS · shadcn/ui · `@libsql/client` (local file SQLite, or remote Turso / libSQL via env)
