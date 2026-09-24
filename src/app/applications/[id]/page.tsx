import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AtsBadge, PlatformBadge, StatusBadge } from "@/components/badges";
import { DeleteApplicationButton } from "@/components/delete-application-button";
import { StatusPipeline } from "@/components/status-pipeline";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addContactAction,
  addFollowUpAction,
  completeFollowUpAction,
  deleteContactAction,
  deleteFollowUpAction,
} from "@/lib/actions";
import { atsLabel, isAtsPortalUrl } from "@/lib/ats";
import { addDaysIso, formatDate, formatDateTime } from "@/lib/dates";
import { listOpportunitiesForApplication } from "@/lib/opportunity-queries";
import {
  getApplication,
  listActivities,
  listContacts,
  listFollowUps,
} from "@/lib/queries";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getApplication(id);
  if (!app) notFound();

  const followUps = await listFollowUps(id);
  const contacts = await listContacts(id);
  const activities = await listActivities(id);
  const linkedOpportunities = await listOpportunitiesForApplication(id);
  const salary =
    app.salary_min || app.salary_max
      ? [app.salary_min, app.salary_max]
          .filter((n) => n != null)
          .map((n) => `$${Number(n).toLocaleString()}`)
          .join(" – ")
      : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <Link href="/applications" className="hover:underline">
              Applications
            </Link>
            <span> / {app.company}</span>
          </p>
          <h1 className="font-heading text-3xl tracking-tight">
            {app.role}
            {app.is_sample ? (
              <span className="ml-2 align-middle text-xs font-sans tracking-wide text-amber-700 uppercase dark:text-amber-300">
                SAMPLE
              </span>
            ) : null}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{app.company}</span>
            <PlatformBadge platform={app.platform} />
            <AtsBadge ats={app.ats} />
            <StatusBadge status={app.status} />
          </div>
          {linkedOpportunities.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              From{" "}
              {linkedOpportunities.map((item, index) => (
                <span key={item.id}>
                  {index > 0 ? ", " : null}
                  <Link href={`/opportunities/${item.id}`} className="text-foreground hover:underline">
                    {item.title}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/applications/${app.id}/edit`}>Edit</Link>
          </Button>
          <DeleteApplicationButton id={app.id} company={app.company} />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Status pipeline</CardTitle>
          <CardDescription>
            Applied automatically schedules a 7-day follow-up when none is open.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatusPipeline applicationId={app.id} current={app.status} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Meta label="Location" value={app.location} />
            <Meta label="Applied" value={formatDate(app.applied_at)} />
            <Meta label="Compensation" value={salary} />
            <Meta label="ATS" value={atsLabel(app.ats)} />
            <Meta
              className="sm:col-span-2"
              label={isAtsPortalUrl(app.job_url) ? "ATS portal" : "Job link"}
              value={
                app.job_url ? (
                  <a
                    href={app.job_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                  >
                    Open listing <ExternalLink className="size-3" />
                  </a>
                ) : null
              }
            />
            <div className="sm:col-span-2">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{app.notes || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Follow-ups</CardTitle>
            <CardDescription>Overdue, today, and upcoming pings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">None scheduled.</p>
            ) : (
              <ul className="space-y-3">
                {followUps.map((item) => (
                  <li key={item.id} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-sm font-medium">{formatDate(item.due_at)}</p>
                    <p className="text-xs text-muted-foreground">{item.note || "Follow up"}</p>
                    {item.completed_at ? (
                      <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                        Done {formatDateTime(item.completed_at)}
                      </p>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <form action={completeFollowUpAction.bind(null, item.id)}>
                          <SubmitButton variant="secondary">Complete</SubmitButton>
                        </form>
                        <form action={deleteFollowUpAction.bind(null, item.id)}>
                          <SubmitButton variant="ghost">Remove</SubmitButton>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <form action={addFollowUpAction.bind(null, app.id)} className="space-y-2 border-t pt-3">
              <Label htmlFor="due_at">Schedule another</Label>
              <Input
                id="due_at"
                name="due_at"
                type="date"
                required
                defaultValue={addDaysIso(7)}
              />
              <Input name="note" placeholder="Note (optional)" />
              <SubmitButton variant="outline">Add follow-up</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              <ol className="space-y-3">
                {activities.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/70" />
                    <div>
                      <p className="text-sm">{item.message}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contacts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts yet.</p>
            ) : (
              <ul className="space-y-3">
                {contacts.map((person) => (
                  <li key={person.id} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-sm font-medium">{person.name}</p>
                    <p className="text-xs text-muted-foreground">{person.title || "Contact"}</p>
                    {person.email ? (
                      <p className="text-xs">
                        <a className="hover:underline" href={`mailto:${person.email}`}>
                          {person.email}
                        </a>
                      </p>
                    ) : null}
                    {person.linkedin_url ? (
                      <a
                        href={person.linkedin_url}
                        className="text-xs text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        LinkedIn
                      </a>
                    ) : null}
                    <form action={deleteContactAction.bind(null, person.id)} className="mt-2">
                      <SubmitButton variant="ghost">Remove</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={addContactAction.bind(null, app.id)} className="space-y-2 border-t pt-3">
              <Label htmlFor="name">Add contact</Label>
              <Input id="name" name="name" required placeholder="Name" />
              <Input name="title" placeholder="Title" />
              <Input name="email" type="email" placeholder="Email" />
              <Input name="phone" placeholder="Phone" />
              <Input name="linkedin_url" placeholder="LinkedIn URL" />
              <Textarea name="notes" placeholder="Notes" rows={2} />
              <SubmitButton variant="outline">Save contact</SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="mt-1 text-sm">{value || "—"}</div>
    </div>
  );
}
