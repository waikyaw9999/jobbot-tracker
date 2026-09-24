import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AtsBadge, FitBadge, OpportunityStatusBadge, PlatformBadge } from "@/components/badges";
import { CopyTextButton } from "@/components/copy-text-button";
import { DeleteOpportunityButton } from "@/components/delete-opportunity-button";
import { OpportunityTriage } from "@/components/opportunity-triage";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/dates";
import { findDuplicates, getOpportunity } from "@/lib/opportunity-queries";

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();

  const duplicates = await findDuplicates({
    company: opportunity.company,
    title: opportunity.title,
    jobUrl: opportunity.job_url,
    excludeOpportunityId: opportunity.id,
    excludeApplicationId: opportunity.application_id,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link href="/opportunities" className="hover:underline">
              Opportunities
            </Link>
            <span> / {opportunity.company}</span>
          </p>
          <h1 className="font-heading text-3xl tracking-tight">{opportunity.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{opportunity.company}</span>
            <PlatformBadge platform={opportunity.source} />
            <AtsBadge ats={opportunity.ats} />
            <OpportunityStatusBadge status={opportunity.status} />
            <FitBadge fit={opportunity.fit} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/opportunities/${opportunity.id}/edit`}>Edit</Link>
          </Button>
          <DeleteOpportunityButton id={opportunity.id} company={opportunity.company} />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Triage</CardTitle>
          <CardDescription>
            Promote adds a Saved application and keeps this draft linked. Nothing is emailed
            or submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <OpportunityTriage
            id={opportunity.id}
            status={opportunity.status}
            applicationId={opportunity.application_id}
          />
          {opportunity.fit_reason ? (
            <p className="text-xs text-muted-foreground">{opportunity.fit_reason}</p>
          ) : null}
        </CardContent>
      </Card>

      {duplicates.length > 0 ? (
        <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-500/30 dark:text-amber-100">
          <p className="font-medium">Possible duplicate</p>
          <ul className="mt-1 space-y-1">
            {duplicates.map((match) => (
              <li key={`${match.kind}-${match.id}`}>
                <Link href={match.href} className="underline-offset-4 hover:underline">
                  {match.company} — {match.title}
                </Link>
                <span>
                  {" "}
                  · {match.kind === "application" ? "application" : "opportunity"} ·{" "}
                  {match.reason === "url" ? "same URL" : "same company + title"}
                </span>
              </li>
            ))}
          </ul>
          {duplicates.some((match) => match.kind === "application") && !opportunity.application_id ? (
            <p className="mt-1 text-xs">Promote links the existing application instead of creating another.</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Cover letter</CardTitle>
            <CardDescription>Stored on this opportunity. Copy it when you are ready to send it yourself.</CardDescription>
            {opportunity.cover_letter ? (
              <CardAction>
                <CopyTextButton text={opportunity.cover_letter} label="Copy letter" />
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            {opportunity.cover_letter ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{opportunity.cover_letter}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                No draft yet.{" "}
                <Link href={`/opportunities/${opportunity.id}/edit`} className="underline-offset-4 hover:underline">
                  Write one
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Listing</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Meta label="Location" value={opportunity.location} />
            <Meta label="Visa / sponsor" value={opportunity.visa_note} />
            <Meta label="Discovered" value={formatDate(opportunity.discovered_at)} />
            <Meta label="Updated" value={formatDateTime(opportunity.updated_at)} />
            <Meta
              label="Job link"
              value={
                opportunity.job_url ? (
                  <a
                    href={opportunity.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                  >
                    Open listing <ExternalLink className="size-3" />
                  </a>
                ) : null
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{opportunity.notes || "—"}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="mt-1 text-sm">{value || "—"}</div>
    </div>
  );
}
