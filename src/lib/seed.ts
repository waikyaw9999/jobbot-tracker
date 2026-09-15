import "server-only";

import { getDb } from "@/lib/db";
import { addDaysIso, todayIso } from "@/lib/dates";
import {
  addActivity,
  clearSampleData,
  insertApplication,
  insertContact,
  insertFollowUp,
} from "@/lib/queries";
import type { Platform, Status } from "@/lib/constants";

type SeedApp = {
  company: string;
  role: string;
  platform: Platform;
  status: Status;
  location: string;
  job_url: string;
  salary_min: number;
  salary_max: number;
  notes: string;
  appliedOffset?: number;
  followUp?: { offset: number; note: string; done?: boolean };
  contacts?: {
    name: string;
    title: string;
    email: string;
    linkedin_url?: string;
  }[];
};

export function seedSampleData() {
  const db = getDb();
  const today = todayIso();

  const seeds: SeedApp[] = [
    {
      company: "Stripe",
      role: "Senior Frontend Engineer",
      platform: "greenhouse",
      status: "interview",
      location: "San Francisco, CA · Hybrid",
      job_url: "https://stripe.com/jobs/listing/senior-frontend-engineer",
      salary_min: 210000,
      salary_max: 260000,
      notes:
        "Onsite loop scheduled. Prep: payments UI, design systems, and incident stories.",
      appliedOffset: -18,
      followUp: {
        offset: 2,
        note: "Send thank-you + loop recap to recruiter",
      },
      contacts: [
        {
          name: "Priya Nandakumar",
          title: "Recruiter",
          email: "priya.n@example.com",
          linkedin_url: "https://linkedin.com/in/example-priya",
        },
      ],
    },
    {
      company: "Notion",
      role: "Full Stack Engineer",
      platform: "linkedin",
      status: "recruiter_screen",
      location: "New York, NY · Hybrid",
      job_url: "https://www.linkedin.com/jobs/view/notion-fullstack",
      salary_min: 180000,
      salary_max: 230000,
      notes: "Recruiter asked about blocks/editor experience and collaboration features.",
      appliedOffset: -9,
      followUp: {
        offset: 1,
        note: "Confirm recruiter screen time and send portfolio",
      },
      contacts: [
        {
          name: "Marcus Hale",
          title: "Technical Recruiter",
          email: "marcus.h@example.com",
        },
      ],
    },
    {
      company: "Figma",
      role: "Product Engineer",
      platform: "wellfound",
      status: "applied",
      location: "Remote (US)",
      job_url: "https://www.wellfound.com/jobs/figma-product-engineer",
      salary_min: 175000,
      salary_max: 220000,
      notes: "Applied via Wellfound. Customize FigJam plugin story in follow-up.",
      appliedOffset: -11,
      followUp: {
        offset: -3,
        note: "Overdue: ping recruiter if no reply on application",
      },
    },
    {
      company: "Linear",
      role: "Software Engineer",
      platform: "lever",
      status: "hiring_manager",
      location: "Remote",
      job_url: "https://linear.app/careers",
      salary_min: 170000,
      salary_max: 210000,
      notes: "HM chat with eng manager. They care about craft, speed, and issue UX.",
      appliedOffset: -14,
      followUp: {
        offset: 4,
        note: "Follow up after hiring-manager conversation",
      },
      contacts: [
        {
          name: "Elena Voss",
          title: "Engineering Manager",
          email: "elena.v@example.com",
        },
      ],
    },
    {
      company: "Vercel",
      role: "Solutions Engineer",
      platform: "referral",
      status: "offer",
      location: "Remote",
      job_url: "https://vercel.com/careers",
      salary_min: 165000,
      salary_max: 200000,
      notes: "Verbal offer. Waiting on written comp + refreshers. Referral from Sam.",
      appliedOffset: -28,
      followUp: {
        offset: 0,
        note: "Today: review offer packet and reply to recruiter",
      },
      contacts: [
        {
          name: "Sam Okonkwo",
          title: "Referrer · Staff Engineer",
          email: "sam.o@example.com",
        },
        {
          name: "Jordan Lee",
          title: "Recruiter",
          email: "jordan.l@example.com",
        },
      ],
    },
    {
      company: "Airbnb",
      role: "Frontend Engineer, Host",
      platform: "indeed",
      status: "saved",
      location: "Seattle, WA",
      job_url: "https://careers.airbnb.com",
      salary_min: 190000,
      salary_max: 240000,
      notes: "Saved from Indeed. Tailor resume to host tools before applying.",
    },
    {
      company: "Duolingo",
      role: "iOS Engineer",
      platform: "handshake",
      status: "ghosted",
      location: "Pittsburgh, PA · Hybrid",
      job_url: "https://careers.duolingo.com",
      salary_min: 150000,
      salary_max: 185000,
      notes: "Completed take-home, then silence for 3 weeks.",
      appliedOffset: -40,
      followUp: {
        offset: -10,
        note: "Closed out after no response",
        done: true,
      },
    },
    {
      company: "Shopify",
      role: "Staff Engineer, Admin",
      platform: "email",
      status: "rejected",
      location: "Remote (Americas)",
      job_url: "https://www.shopify.com/careers",
      salary_min: 200000,
      salary_max: 250000,
      notes: "Kind rejection after system design. Ask for feedback next cycle.",
      appliedOffset: -45,
    },
    {
      company: "Ramp",
      role: "Backend Engineer",
      platform: "glassdoor",
      status: "applied",
      location: "New York, NY",
      job_url: "https://ramp.com/careers",
      salary_min: 175000,
      salary_max: 215000,
      notes: "Glassdoor listing. Highlight spend-platform and ledger work.",
      appliedOffset: -6,
      followUp: {
        offset: 0,
        note: "Today: check application portal + LinkedIn recruiter",
      },
    },
    {
      company: "Anthropic",
      role: "Full Stack Engineer",
      platform: "linkedin",
      status: "withdrawn",
      location: "San Francisco, CA",
      job_url: "https://www.anthropic.com/careers",
      salary_min: 220000,
      salary_max: 280000,
      notes: "Withdrew after timeline slipped. Keep warm for next opening.",
      appliedOffset: -21,
    },
    {
      company: "Northwind Labs",
      role: "Founding Engineer",
      platform: "other",
      status: "accepted",
      location: "Austin, TX",
      job_url: "https://northwindlabs.example.com",
      salary_min: 160000,
      salary_max: 180000,
      notes: "SAMPLE accepted role — used to demo the happy path. Not a real offer.",
      appliedOffset: -60,
    },
    {
      company: "Datadog",
      role: "Frontend Engineer, RUM",
      platform: "greenhouse",
      status: "applied",
      location: "Boston, MA · Hybrid",
      job_url: "https://careers.datadoghq.com",
      salary_min: 170000,
      salary_max: 210000,
      notes: "Applied through Greenhouse. Observability + canvas performance stories.",
      appliedOffset: -3,
      followUp: {
        offset: 4,
        note: "This week: follow up if no recruiter screen",
      },
    },
  ];

  const run = db.transaction(() => {
    clearSampleData();
    for (const seed of seeds) {
      const appliedAt =
        seed.appliedOffset !== undefined
          ? addDaysIso(seed.appliedOffset)
          : seed.status === "saved"
            ? null
            : today;
      const applicationId = insertApplication(
        {
          company: seed.company,
          role: seed.role,
          platform: seed.platform,
          status: seed.status,
          location: seed.location,
          job_url: seed.job_url,
          salary_min: seed.salary_min,
          salary_max: seed.salary_max,
          notes: seed.notes,
          applied_at: appliedAt,
        },
        { isSample: true, skipAutoFollowUp: true }
      );

      if (seed.followUp) {
        const due = addDaysIso(seed.followUp.offset);
        const followUpId = insertFollowUp(applicationId, due, seed.followUp.note, {
          silent: true,
        });
        if (seed.followUp.done) {
          db.prepare(
            "UPDATE follow_ups SET completed_at = ? WHERE id = ?"
          ).run(addDaysIso(seed.followUp.offset + 1) + "T16:00:00.000Z", followUpId);
        }
      }

      for (const contact of seed.contacts ?? []) {
        insertContact(applicationId, contact);
      }

      addActivity(
        applicationId,
        "seeded",
        "Loaded as SAMPLE demo data — safe to clear anytime"
      );
    }
  });

  run();
}
