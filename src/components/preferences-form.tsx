"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ASSIST_SOURCES, MARKETS, parseMarketCodes, parseSourceList, SENIORITIES } from "@/lib/assist";
import { NativeSelect } from "@/components/native-select";
import { resetPreferencesAction, savePreferencesAction } from "@/lib/opportunity-actions";
import type { SearchPreferences } from "@/lib/types";

export function PreferencesForm({ preferences }: { preferences: SearchPreferences }) {
  const [state, action] = useActionState(savePreferencesAction, null);
  const selected = new Set(parseSourceList(preferences.sources));
  const markets = new Set(
    parseMarketCodes(preferences.market_codes).length
      ? parseMarketCodes(preferences.market_codes)
      : ["SG", "TH", "AU"]
  );

  return (
    <div className="space-y-6">
      <form action={action} className="grid gap-4">
        <Field
          label="Keywords / target titles"
          htmlFor="include_titles"
          hint="One title or keyword per line. Used for fit hints."
        >
          <Textarea
            id="include_titles"
            name="include_titles"
            rows={6}
            defaultValue={preferences.include_titles}
          />
        </Field>
        <Field label="Exclude keywords" htmlFor="exclude_keywords" hint="Roles matching these are scored as Stretch.">
          <Textarea
            id="exclude_keywords"
            name="exclude_keywords"
            rows={4}
            defaultValue={preferences.exclude_keywords}
          />
        </Field>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Markets</legend>
          <p className="text-xs text-muted-foreground">
            Thailand, Singapore, and Australia are on by default. Uncheck a market to leave it out of this profile.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {MARKETS.map((market) => (
              <label key={market.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="market_codes"
                  value={market.value}
                  defaultChecked={markets.has(market.value)}
                  className="size-4 accent-primary"
                />
                {market.label}
                <span className="text-xs text-muted-foreground">{market.value}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          label="Market notes"
          htmlFor="markets"
          hint="Optional place names for inbox chips. Example: Thailand / Bangkok."
        >
          <Textarea id="markets" name="markets" rows={3} defaultValue={preferences.markets} />
        </Field>
        <div>
          <Label htmlFor="min_seniority" className="mb-1.5">
            Minimum seniority
          </Label>
          <NativeSelect
            id="min_seniority"
            name="min_seniority"
            defaultValue={preferences.min_seniority || "senior"}
          >
            {SENIORITIES.filter((item) => item.value !== "unknown").map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </NativeSelect>
          <p className="mt-1 text-xs text-muted-foreground">
            Roles below this level are scored as Stretch.
          </p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="require_sponsorship_au"
            defaultChecked={preferences.require_sponsorship_au !== 0}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            Require sponsorship for Australia
            <span className="mt-1 block text-xs text-muted-foreground">
              Australian listings marked sponsorship no are scored as Stretch.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" defaultChecked disabled className="mt-0.5 size-4" />
          <input type="hidden" name="never_invent_email" value="on" />
          <span>
            Never invent email addresses
            <span className="mt-1 block text-xs">
              Contacts are stored only when you type an address or a digest marks it verified.
            </span>
          </span>
        </label>
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">Preferred sources</legend>
          <p className="text-xs text-muted-foreground">
            A shortlist for this search. Opportunities can still use any board.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ASSIST_SOURCES.map((source) => (
              <label key={source.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="sources"
                  value={source.value}
                  defaultChecked={selected.has(source.value)}
                  className="size-4 accent-primary"
                />
                {source.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          label="Stack keywords"
          htmlFor="stack_keywords"
          hint="Comma or line separated. Fit hints count overlaps with the role title, location, visa note, and notes."
        >
          <Textarea
            id="stack_keywords"
            name="stack_keywords"
            rows={5}
            defaultValue={preferences.stack_keywords}
          />
        </Field>
        <Field
          label="Cover-letter notes"
          htmlFor="notes"
          hint="Tone rules shown next to the draft. Letters stay on the opportunity until you copy them."
        >
          <Textarea id="notes" name="notes" rows={8} defaultValue={preferences.notes} />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton>Save preferences</SubmitButton>
          {state?.message ? (
            <p className={state.ok ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-destructive"}>
              {state.message}
            </p>
          ) : null}
        </div>
      </form>

      <form
        action={resetPreferencesAction}
        onSubmit={(event) => {
          if (!confirm("Replace saved search preferences with the suggested defaults?")) {
            event.preventDefault();
          }
        }}
      >
        <SubmitButton variant="outline">Reset to suggested defaults</SubmitButton>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor} className="mb-1.5">
        {label}
      </Label>
      {children}
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
