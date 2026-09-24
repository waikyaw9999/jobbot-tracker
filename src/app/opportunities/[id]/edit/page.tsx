import Link from "next/link";
import { notFound } from "next/navigation";
import { OpportunityForm } from "@/components/opportunity-form";
import { todayIso } from "@/lib/dates";
import {
  getLatestDraft,
  getOpportunity,
  getOpportunityContact,
  getSearchPreferences,
} from "@/lib/opportunity-queries";

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [opportunity, preferences, contact, draft] = await Promise.all([
    getOpportunity(id),
    getSearchPreferences(),
    getOpportunityContact(id),
    getLatestDraft(id),
  ]);
  if (!opportunity) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href={`/opportunities/${opportunity.id}`} className="hover:underline">
            {opportunity.company}
          </Link>
          <span> / Edit</span>
        </p>
        <h1 className="font-heading text-3xl tracking-tight">Edit opportunity</h1>
      </header>
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <OpportunityForm
          opportunity={opportunity}
          preferences={preferences}
          today={todayIso()}
          contact={contact}
          draft={draft}
        />
      </div>
    </div>
  );
}
