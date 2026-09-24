import { OpportunityForm } from "@/components/opportunity-form";
import { todayIso } from "@/lib/dates";
import { getSearchPreferences } from "@/lib/opportunity-queries";

export default async function NewOpportunityPage() {
  const preferences = await getSearchPreferences();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="font-heading text-3xl tracking-tight">Add opportunity</h1>
        <p className="text-sm text-muted-foreground">
          Capture a role from a digest or a listing URL. This saves a draft in your inbox.
          It does not apply or send email.
        </p>
      </header>
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <OpportunityForm preferences={preferences} today={todayIso()} />
      </div>
    </div>
  );
}
