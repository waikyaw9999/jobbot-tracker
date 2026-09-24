// npx tsx scripts/check-assist.ts
import assert from "node:assert/strict";
import {
  companyTitleKey,
  DIGEST_EXAMPLE,
  hintsFromJobUrl,
  inferMarket,
  parseDigest,
  parseSponsorship,
  scoreFit,
  storableContactEmail,
  urlKeyOf,
  DEFAULT_SEARCH_PREFERENCES,
} from "../src/lib/assist.ts";

const prefs = DEFAULT_SEARCH_PREFERENCES;

const parsed = parseDigest(DIGEST_EXAMPLE);
assert.equal(parsed.errors.length, 0, parsed.errors.join("\n"));
assert.equal(parsed.rows.length, 2);
assert.equal(parsed.rows[0].digestStatus, "draft_ready");
assert.equal(parsed.rows[0].company, "Northwind");
assert.equal(parsed.rows[0].title, "Senior Full Stack Engineer");
assert.equal(parsed.rows[0].source, "linkedin");
assert.equal(parsed.rows[0].fit, "Excellent");
assert.equal(parsed.rows[0].visaNote, null);
assert.match(parsed.rows[0].coverLetter ?? "", /Java and Spring/);
assert.equal(parsed.rows[1].digestStatus, "worth_a_look");
assert.equal(parsed.rows[1].source, "jaabz");
assert.equal(parsed.rows[1].visaNote, "482 sponsor");
assert.equal(parsed.rows[1].location, "Sydney");

const csv = parseDigest(`status,role,company,location,source,visa,fit,url,cover_letter
draft ready,Senior Full Stack Engineer,Northwind,Singapore,JobStreet SG,,Strong,https://sg.jobstreet.com/job/1,"Dear team, Java."
applied,Tech Lead,Contoso,Bangkok,Michael Page,—,Good,https://www.michaelpage.com.sg/job/2,
`);
assert.equal(csv.errors.length, 0, csv.errors.join("\n"));
assert.equal(csv.rows.length, 2);
assert.equal(csv.rows[0].source, "jobstreet");
assert.equal(csv.rows[0].coverLetter, "Dear team, Java.");
assert.equal(csv.rows[1].digestStatus, "applied");
assert.equal(csv.rows[1].source, "michael_page");
assert.equal(csv.rows[1].visaNote, null);

const linkedInA = urlKeyOf("https://www.linkedin.com/jobs/view/1234567890?trk=public_jobs");
const linkedInB = urlKeyOf("https://linkedin.com/jobs/view/senior-engineer-1234567890");
assert.equal(linkedInA, "linkedin:job:1234567890");
assert.equal(linkedInA, linkedInB);
assert.equal(urlKeyOf(""), null);
assert.equal(urlKeyOf("https://www.indeed.com/viewjob?jk=AbC123"), "indeed:jk:abc123");
assert.equal(companyTitleKey("Acme, Inc.", "Senior Engineer"), companyTitleKey("Acme Inc", "senior engineer"));

const ashby = hintsFromJobUrl("https://jobs.ashbyhq.com/northwind/4f2c1b");
assert.equal(ashby.source, "ashby");
assert.equal(ashby.ats, "ashby");
assert.equal(ashby.companyHint, "Northwind");

const greenhouse = hintsFromJobUrl("https://boards.greenhouse.io/airbnb/jobs/123");
assert.equal(greenhouse.source, "greenhouse");
assert.equal(greenhouse.ats, "greenhouse");
assert.equal(greenhouse.companyHint, "Airbnb");

assert.equal(hintsFromJobUrl("https://th.jobsdb.com/th/en/job/1").source, "jobsdb");
assert.equal(hintsFromJobUrl("https://www.jaabz.com/jobs/1").source, "jaabz");
assert.equal(hintsFromJobUrl("https://www.michaelpage.com.sg/job-detail/x").source, "michael_page");

const excellent = scoreFit(
  {
    title: "Senior Full Stack Engineer",
    notes: "Java, Spring, React, Python, AWS",
  },
  prefs
);
assert.equal(excellent.label, "Excellent");
assert.ok(excellent.matchedStack.includes("Java"));
assert.ok(!excellent.matchedStack.includes("JavaScript"));

const jsOnly = scoreFit({ title: "Frontend Engineer", notes: "javascript daily" }, prefs);
assert.ok(!jsOnly.matchedStack.includes("Java"));

const stretch = scoreFit({ title: "Junior Dentist", notes: "patient care" }, prefs);
assert.equal(stretch.label, "Stretch");
assert.ok(stretch.excluded.includes("junior"));

const strong = scoreFit({ title: "Tech Lead", notes: "Java services" }, prefs);
assert.equal(strong.label, "Strong");

assert.deepEqual(DEFAULT_SEARCH_PREFERENCES.market_codes, ["SG", "TH", "AU"]);
assert.equal(DEFAULT_SEARCH_PREFERENCES.never_invent_email, 1);
assert.equal(inferMarket("Bangkok"), "TH");
assert.equal(inferMarket("Sydney"), "AU");
assert.equal(parseSponsorship("482 sponsor"), "yes");
assert.equal(parseSponsorship("local only"), "no");
assert.equal(storableContactEmail("recruiter@contoso.com", { userEntered: false, verified: false }), null);
assert.equal(
  storableContactEmail("recruiter@contoso.com", { userEntered: false, verified: true }),
  "recruiter@contoso.com"
);

const below = scoreFit({ title: "Mid Full Stack Engineer", notes: "Java Spring Python React AWS" }, prefs);
assert.equal(below.label, "Stretch");
assert.match(below.reason, /below senior seniority/);

const noSponsor = scoreFit(
  { title: "Senior Full Stack Engineer", location: "Sydney", sponsorship: "no", notes: "Java Spring Python React AWS" },
  prefs
);
assert.equal(noSponsor.label, "Stretch");
assert.match(noSponsor.reason, /AU sponsorship required/);

const portal = parseDigest(`## Portal only

| Role | Company | Location | Source | Visa | Fit | URL |
| --- | --- | --- | --- | --- | --- | --- |
| Staff Engineer | AdventureWorks | Singapore | LinkedIn | — | Strong | https://www.linkedin.com/jobs/view/555 |
`);
assert.equal(portal.rows[0]?.digestStatus, "portal_only");
assert.equal(portal.rows[0]?.marketCode, "SG");

const verified = parseDigest(`status,role,company,location,source,email,verified,subject
draft ready,Senior Engineer,Fabrikam,Singapore,LinkedIn,jobs@fabrikam.example,yes,Senior Engineer at Fabrikam
new,Senior Engineer,Tailspin,Bangkok,JobStreet,guess@tailspin.example,no,
`);
assert.equal(verified.rows[0]?.contactVerified, true);
assert.equal(verified.rows[0]?.contactEmail, "jobs@fabrikam.example");
assert.equal(verified.rows[1]?.contactVerified, false);
assert.equal(verified.rows[1]?.marketCode, "TH");

console.log("assist checks passed");
