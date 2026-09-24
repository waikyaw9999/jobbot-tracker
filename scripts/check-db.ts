// NODE_OPTIONS='--conditions=react-server' npx tsx scripts/check-db.ts
import assert from "node:assert/strict";
import { DIGEST_EXAMPLE, parseDigest } from "../src/lib/assist.ts";
import {
  findDuplicates,
  getOpportunity,
  getOpportunityContact,
  getSearchPreferences,
  importDigestRow,
  insertOpportunity,
  listOpportunityEvents,
  listOpportunities,
  promoteOpportunity,
  updateOpportunityStatus,
} from "../src/lib/opportunity-queries.ts";
import { deleteApplication, getApplication } from "../src/lib/queries.ts";

async function main() {
const prefs = await getSearchPreferences();
assert.match(prefs.include_titles, /Senior Full Stack/);
assert.match(prefs.notes, /Do not auto-apply/);
assert.match(prefs.markets, /Australia/);
assert.match(prefs.market_codes, /TH/);
assert.match(prefs.market_codes, /SG/);
assert.equal(prefs.require_sponsorship_au, 1);
assert.equal(prefs.never_invent_email, 1);

const createdId = await insertOpportunity({
  title: "Staff Engineer",
  company: "Fabrikam",
  location: "Singapore",
  source: "linkedin",
  job_url: "https://www.linkedin.com/jobs/view/99887766",
  ats: "unknown",
  visa_note: null,
  fit: "Strong",
  fit_score: 40,
  fit_reason: "Strong · 40 · title Staff Engineer",
  status: "new",
  discovered_at: "2026-09-24",
  notes: "Java and Spring platform",
  cover_letter: "Dear team, Java and Spring fit this role.",
  application_id: null,
});

const dupOnCreate = await findDuplicates({
  company: "Fabrikam",
  title: "Staff Engineer",
  jobUrl: "https://linkedin.com/jobs/view/staff-99887766?trk=x",
  excludeOpportunityId: createdId,
});
assert.equal(dupOnCreate.length, 0);

const dup = await findDuplicates({
  company: "Fabrikam",
  title: "Staff Engineer",
  jobUrl: "https://linkedin.com/jobs/view/staff-99887766?trk=x",
});
assert.equal(dup.length, 1);
assert.equal(dup[0]?.kind, "opportunity");
assert.equal(dup[0]?.reason, "url");

const parsed = parseDigest(DIGEST_EXAMPLE);
assert.equal(parsed.rows.length, 2);
const imported = await importDigestRow(parsed.rows[0], { recordApplied: false });
assert.equal(imported, "imported");
const skipped = await importDigestRow(parsed.rows[0], { recordApplied: false });
assert.equal(skipped, "skipped");

const inbox = await listOpportunities({ status: "draft_ready" });
assert.ok(inbox.some((row) => row.company === "Northwind" && row.cover_letter?.includes("Java")));

const applicationId = await promoteOpportunity(createdId);
const application = await getApplication(applicationId);
assert.equal(application?.status, "saved");
assert.equal(application?.company, "Fabrikam");
assert.equal(application?.role, "Staff Engineer");
assert.equal(application?.platform, "linkedin");
assert.match(application?.notes ?? "", /Nothing was emailed or submitted/);
const promoted = await getOpportunity(createdId);
assert.equal(promoted?.status, "promoted");
assert.equal(promoted?.application_id, applicationId);

const linkedAgain = await promoteOpportunity(createdId);
assert.equal(linkedAgain, applicationId);

await deleteApplication(applicationId);
const restored = await getOpportunity(createdId);
assert.equal(restored?.application_id, null);
assert.equal(restored?.status, "draft_ready");

const appliedRow = parseDigest(`status,role,company,location,source,visa,fit,url
applied,Engineering Manager,Litware,Sydney,Jaabz,482 sponsor,Strong,https://jaabz.com/jobs/litware-em
`).rows[0];
assert.ok(appliedRow);
const applied = await importDigestRow(appliedRow, { recordApplied: true });
assert.equal(applied, "applied");
const appliedRows = await listOpportunities({ q: "Litware" });
assert.equal(appliedRows[0]?.status, "promoted");
assert.ok(appliedRows[0]?.application_id);
const appliedApp = await getApplication(appliedRows[0]!.application_id!);
assert.equal(appliedApp?.status, "applied");
assert.match(appliedApp?.notes ?? "", /did not email or submit/);

const captured = await getOpportunity(createdId);
assert.equal(captured?.market, "SG");

const portalRow = parseDigest(`status,role,company,location,email,verified
portal only,Senior Engineer,WideWorld,Bangkok,hr@wideworld.example,no
`).rows[0];
assert.ok(portalRow);
assert.equal(await importDigestRow(portalRow, { recordApplied: false }), "imported");
const portalRows = await listOpportunities({ q: "WideWorld", marketCode: "TH" });
assert.equal(portalRows[0]?.status, "portal_only");
assert.equal(portalRows[0]?.market, "TH");
const hidden = await getOpportunityContact(portalRows[0]!.id);
assert.equal(hidden?.email, null);
assert.match(hidden?.verification_note ?? "", /not stored/);
await updateOpportunityStatus(portalRows[0]!.id, "skipped", "Portal application only");
const events = await listOpportunityEvents(portalRows[0]!.id);
assert.ok(events.some((event) => event.message.includes("Portal application only")));

console.log("db checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
