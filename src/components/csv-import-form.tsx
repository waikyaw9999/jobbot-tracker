"use client";

import { useActionState } from "react";
import { importCsvAction } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

export function CsvImportForm() {
  const [state, action] = useActionState(importCsvAction, null);

  return (
    <form action={action} className="space-y-3">
      <Input name="file" type="file" accept=".csv,text/csv" required />
      <SubmitButton>Import CSV</SubmitButton>
      {state?.message ? (
        <p className={state.ok ? "text-sm text-emerald-700 dark:text-emerald-300" : "text-sm text-destructive"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
