"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { importDigestAction } from "@/lib/opportunity-actions";

export function DigestImportForm() {
  const [state, action] = useActionState(importDigestAction, null);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Textarea
          name="digest"
          rows={14}
          placeholder="Paste a markdown table or CSV digest…"
          className="font-mono text-xs"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          If you choose a file, the file is used and the pasted text is ignored.
        </p>
      </div>
      <Input name="file" type="file" accept=".md,.markdown,.csv,.txt,text/csv,text/markdown,text/plain" />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="record_applied" className="mt-0.5 size-4 accent-primary" />
        <span>
          Also record rows marked <span className="font-medium">applied</span> in the applications
          pipeline. Leave this off to keep them as drafts. Nothing is emailed or submitted either way.
        </span>
      </label>
      <SubmitButton>Import into opportunities</SubmitButton>
      {state?.message ? (
        <p className={state.ok ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-destructive"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
