"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AtsCombobox } from "@/components/ats-fields";
import { NativeSelect } from "@/components/native-select";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FIT_LABELS,
  hintsFromJobUrl,
  OPPORTUNITY_STATUSES,
  scoreFit,
} from "@/lib/assist";
import { PLATFORM_GROUPS } from "@/lib/constants";
import {
  createOpportunityAction,
  findDuplicateMatchesAction,
  updateOpportunityAction,
} from "@/lib/opportunity-actions";
import type { DuplicateMatch, Opportunity, SearchPreferences } from "@/lib/types";

export function OpportunityForm({
  opportunity,
  preferences,
  today,
}: {
  opportunity?: Opportunity;
  preferences: SearchPreferences;
  today: string;
}) {
  const action = opportunity
    ? updateOpportunityAction.bind(null, opportunity.id)
    : createOpportunityAction;

  const [url, setUrl] = useState(opportunity?.job_url ?? "");
  const [title, setTitle] = useState(opportunity?.title ?? "");
  const [company, setCompany] = useState(opportunity?.company ?? "");
  const [source, setSource] = useState<string>(opportunity?.source ?? "linkedin");
  const [ats, setAts] = useState<string>(opportunity?.ats || "unknown");
  const [fit, setFit] = useState(opportunity?.fit ?? "");
  const [fitReason, setFitReason] = useState(opportunity?.fit_reason ?? "");
  const [fitScore, setFitScore] = useState<number | null>(opportunity?.fit_score ?? null);
  const [sourceTouched, setSourceTouched] = useState(Boolean(opportunity));
  const [atsTouched, setAtsTouched] = useState(
    Boolean(opportunity?.ats && opportunity.ats !== "unknown")
  );
  const [companyTouched, setCompanyTouched] = useState(Boolean(opportunity));
  const [companyHinted, setCompanyHinted] = useState(false);
  const [matches, setMatches] = useState<DuplicateMatch[]>([]);
  const locationRef = useRef<HTMLInputElement>(null);
  const visaRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (title.trim().length < 2 || company.trim().length < 2) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      void findDuplicateMatchesAction({
        company,
        title,
        jobUrl: url,
        excludeOpportunityId: opportunity?.id,
        excludeApplicationId: opportunity?.application_id,
      }).then((rows) => {
        if (!cancelled) setMatches(rows);
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [company, title, url, opportunity?.id, opportunity?.application_id]);

  function applyUrl(next: string) {
    setUrl(next);
    const hints = hintsFromJobUrl(next);
    if (!sourceTouched && hints.source) setSource(hints.source);
    if (!atsTouched && hints.ats) {
      setAts(hints.ats);
    }
    if (!companyTouched && hints.companyHint) {
      setCompany(hints.companyHint);
      setCompanyHinted(true);
    }
  }

  function suggestFit() {
    if (!title.trim()) {
      setFitReason("Add a role title first.");
      return;
    }
    const result = scoreFit(
      {
        title,
        company,
        location: locationRef.current?.value,
        visaNote: visaRef.current?.value,
        notes: notesRef.current?.value,
      },
      preferences
    );
    setFit(result.label);
    setFitScore(result.score);
    setFitReason(result.reason);
  }

  const fitChoices = fit && !FIT_LABELS.includes(fit as (typeof FIT_LABELS)[number])
    ? [...FIT_LABELS, fit]
    : [...FIT_LABELS];
  const statuses = OPPORTUNITY_STATUSES.filter(
    (status) => status.value !== "promoted" || opportunity?.status === "promoted"
  );

  return (
    <form action={action} className="grid gap-4">
      <Field label="Job URL" htmlFor="job_url" className="sm:col-span-2">
        <Input
          id="job_url"
          name="job_url"
          type="url"
          value={url}
          onChange={(event) => applyUrl(event.target.value)}
          placeholder="https://www.linkedin.com/jobs/view/… or an Ashby / JobStreet / Jaabz link"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Paste a listing URL to prefill the source and ATS. Titles are not scraped — type the role
          and company. Nothing is submitted to the board.
        </p>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role" htmlFor="title">
          <Input
            id="title"
            name="title"
            required
            value={title}
            onChange={(event) => {
              const next = event.target.value;
              setTitle(next);
              if (next.trim().length < 2 || company.trim().length < 2) setMatches([]);
            }}
            placeholder="Senior Full Stack Engineer"
          />
        </Field>
        <Field label="Company" htmlFor="company">
          <Input
            id="company"
            name="company"
            required
            value={company}
            onChange={(event) => {
              const next = event.target.value;
              setCompanyTouched(true);
              setCompanyHinted(false);
              setCompany(next);
              if (title.trim().length < 2 || next.trim().length < 2) setMatches([]);
            }}
            placeholder="Northwind"
          />
          {companyHinted ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Company guessed from the career-site URL. Edit it if that slug is wrong.
            </p>
          ) : null}
        </Field>
        <Field label="Location" htmlFor="location">
          <Input
            id="location"
            name="location"
            ref={locationRef}
            defaultValue={opportunity?.location ?? ""}
            placeholder="Singapore · Bangkok · Sydney"
          />
        </Field>
        <Field label="Source" htmlFor="source">
          <NativeSelect
            id="source"
            name="source"
            value={source}
            onChange={(event) => {
              setSourceTouched(true);
              setSource(event.target.value);
            }}
          >
            {PLATFORM_GROUPS.map((group) => (
              <optgroup key={group.region} label={group.label}>
                {group.items.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </Field>
        <Field label="ATS" htmlFor="ats">
          <AtsCombobox
            id="ats"
            value={ats}
            onChange={(next) => {
              setAtsTouched(true);
              setAts(next);
            }}
          />
        </Field>
        <Field label="Status" htmlFor="status">
          <NativeSelect id="status" name="status" defaultValue={opportunity?.status ?? "new"}>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Visa / sponsor" htmlFor="visa_note">
          <Input
            id="visa_note"
            name="visa_note"
            ref={visaRef}
            defaultValue={opportunity?.visa_note ?? ""}
            placeholder="482 sponsor · not stated · local only"
          />
        </Field>
        <Field label="Discovered" htmlFor="discovered_at">
          <Input
            id="discovered_at"
            name="discovered_at"
            type="date"
            defaultValue={opportunity?.discovered_at ?? today}
          />
        </Field>
        <Field label="Fit" htmlFor="fit">
          <div className="flex gap-2">
            <NativeSelect
              id="fit"
              name="fit"
              value={fit}
              onChange={(event) => {
                setFit(event.target.value);
                setFitReason("");
                setFitScore(null);
              }}
            >
              <option value="">No fit yet</option>
              {fitChoices.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <button
              type="button"
              onClick={suggestFit}
              className="h-8 shrink-0 rounded-lg border border-input px-2.5 text-sm hover:bg-muted"
            >
              Suggest
            </button>
          </div>
          <input type="hidden" name="fit_reason" value={fitReason} />
          <input type="hidden" name="fit_score" value={fitScore ?? ""} />
          {fitReason ? <p className="mt-1 text-xs text-muted-foreground">{fitReason}</p> : (
            <p className="mt-1 text-xs text-muted-foreground">
              Suggest compares the title and notes with your Assist titles and stack. No model API is called.
            </p>
          )}
        </Field>
        <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
          <Textarea
            id="notes"
            name="notes"
            ref={notesRef}
            rows={4}
            defaultValue={opportunity?.notes ?? ""}
            placeholder="Listing snippet, recruiter context, why it is or is not a fit…"
          />
        </Field>
        <Field label="Cover letter draft" htmlFor="cover_letter" className="sm:col-span-2">
          {preferences.notes ? (
            <p className="mb-2 line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground">
              {preferences.notes}
            </p>
          ) : null}
          <Textarea
            id="cover_letter"
            name="cover_letter"
            rows={10}
            defaultValue={opportunity?.cover_letter ?? ""}
            placeholder="Draft only. JobBot never sends this."
          />
        </Field>
      </div>

      {matches.length > 0 ? (
        <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-500/30 dark:text-amber-100">
          <p className="font-medium">Possible duplicate</p>
          <ul className="mt-1 space-y-1">
            {matches.map((match) => (
              <li key={`${match.kind}-${match.id}`}>
                <Link href={match.href} className="underline-offset-4 hover:underline">
                  {match.company} — {match.title}
                </Link>
                <span className="text-amber-900/80 dark:text-amber-100/80">
                  {" "}
                  · {match.kind === "application" ? "application" : "opportunity"} ·{" "}
                  {match.reason === "url" ? "same URL" : "same company + title"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs">You can still save. Digest import skips duplicates.</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>{opportunity ? "Save changes" : "Save opportunity"}</SubmitButton>
        <Link
          href={opportunity ? `/opportunities/${opportunity.id}` : "/opportunities"}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5">
        {label}
      </Label>
      {children}
    </div>
  );
}
