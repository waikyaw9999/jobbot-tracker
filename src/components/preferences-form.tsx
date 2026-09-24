"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ASSIST_SOURCES, parseSourceList } from "@/lib/assist";
import { resetPreferencesAction, savePreferencesAction } from "@/lib/opportunity-actions";
import type { SearchPreferences } from "@/lib/types";

export function PreferencesForm({ preferences }: { preferences: SearchPreferences }) {
  const [state, action] = useActionState(savePreferencesAction, null);
  const selected = new Set(parseSourceList(preferences.sources));

  return (
    <div className="space-y-6">
      <form action={action} className="grid gap-4">
        <Field label="Target titles" htmlFor="include_titles" hint="One title or phrase per line. Used for fit hints.">
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
        <Field
          label="Markets / locations"
          htmlFor="markets"
          hint="One market per line. These become filter chips on the inbox. Example: Thailand / Bangkok."
        >
          <Textarea id="markets" name="markets" rows={4} defaultValue={preferences.markets} />
        </Field>
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
