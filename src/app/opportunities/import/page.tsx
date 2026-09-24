import Link from "next/link";
import { DigestImportForm } from "@/components/digest-import-form";
import { DIGEST_EXAMPLE } from "@/lib/assist";

export default function ImportDigestPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href="/opportunities" className="hover:underline">
            Opportunities
          </Link>
          <span> / Import</span>
        </p>
        <h1 className="font-heading text-3xl tracking-tight">Import digest</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Paste or upload a JobAlertsWatch-style markdown table or CSV. Duplicates are skipped
          when the company and title, or the job URL, already exist on an opportunity or
          application. Cover letters under a <span className="font-medium">Role — Company</span>{" "}
          heading are attached when the names match.
        </p>
      </header>
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <DigestImportForm />
      </div>
      <details className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <summary className="cursor-pointer text-sm font-medium">Example markdown</summary>
        <pre className="mt-3 overflow-x-auto text-xs leading-relaxed text-muted-foreground">{DIGEST_EXAMPLE}</pre>
        <p className="mt-3 text-xs text-muted-foreground">
          CSV columns: status, role, company, location, market_code, source, visa, fit, url, cover_letter,
          seniority, tech_tags, email, verified. An email is stored only when verified is true.
          Status values: applied, draft ready, portal only, worth a look, skipped, closed. A heading such as{" "}
          <span className="font-medium">## Draft ready</span> sets the status for the next table.
        </p>
      </details>
    </div>
  );
}
