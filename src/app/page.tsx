import Link from "next/link";
import { ArrowUpRight, Briefcase, CalendarClock, Handshake, Timer } from "lucide-react";
import { SampleBanner } from "@/components/sample-banner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { statusLabel } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/dates";
import {
  bucketFollowUps,
  getAtsCounts,
  getDashboardStats,
  getPipelineCounts,
  listOpenFollowUps,
  listRecentActivity,
} from "@/lib/queries";
import { atsLabel } from "@/lib/ats";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const pipeline = await getPipelineCounts();
  const atsCounts = await getAtsCounts(6);
  const followUps = bucketFollowUps(await listOpenFollowUps());
  const activity = await listRecentActivity(8);
  const upcoming = [...followUps.today, ...followUps.week].slice(0, 6);
  const maxPipeline = Math.max(1, ...pipeline.map((p) => p.count));
  const maxAts = Math.max(1, ...atsCounts.map((row) => row.count));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
            Local command center
          </p>
          <h1 className="font-heading text-3xl tracking-tight">Job search, in one place</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Track applications across LinkedIn, Seek, StepStone, Bayt, and the rest
            of the board — plus the ATS portal each one actually lands in.
          </p>
        </div>
        <Button asChild>
          <Link href="/applications/new">Add application</Link>
        </Button>
      </header>

      <SampleBanner sampleCount={stats.sampleCount} empty={stats.total === 0} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Briefcase className="size-4" />}
          label="Active pipeline"
          value={stats.active}
          hint={`${stats.total} total`}
        />
        <StatCard
          icon={<Timer className="size-4" />}
          label="Applied this week"
          value={stats.appliedThisWeek}
          hint="Last 7 days"
        />
        <StatCard
          icon={<CalendarClock className="size-4" />}
          label="Overdue follow-ups"
          value={stats.overdueFollowUps}
          hint="Needs a ping"
          warn={stats.overdueFollowUps > 0}
        />
        <StatCard
          icon={<Handshake className="size-4" />}
          label="Interviews / offers"
          value={`${stats.interviews} / ${stats.offers}`}
          hint="Live conversations"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>Saved through offer — terminal statuses live on each application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipeline.map((item) => (
              <Link
                key={item.status}
                href={`/applications?status=${item.status}`}
                className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3"
              >
                <span className="text-sm">{statusLabel(item.status)}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${(item.count / maxPipeline) * 100}%` }}
                  />
                </span>
                <span className="text-right text-sm tabular-nums text-muted-foreground">
                  {item.count}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Follow-ups</CardTitle>
            <CardDescription>
              {followUps.overdue.length} overdue · {followUps.today.length} today ·{" "}
              {followUps.week.length} this week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {followUps.overdue.slice(0, 3).map((item) => (
              <FollowUpRow key={item.id} {...item} overdue />
            ))}
            {upcoming.length === 0 && followUps.overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open follow-ups. Nice.</p>
            ) : null}
            {upcoming.map((item) => (
              <FollowUpRow key={item.id} {...item} />
            ))}
            <Button asChild variant="outline" size="sm" className="mt-1">
              <Link href="/follow-ups">Open follow-up board</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top ATS</CardTitle>
            <CardDescription>Where applications were actually submitted.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {atsCounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tag an ATS on an application to see a breakdown.
              </p>
            ) : (
              atsCounts.map((item) => (
                <Link
                  key={item.ats}
                  href={`/applications?ats=${item.ats}`}
                  className="space-y-1.5"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">{atsLabel(item.ats)}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {item.count}
                    </span>
                  </span>
                  <span className="block h-2 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary/80"
                      style={{ width: `${(item.count / maxAts) * 100}%` }}
                    />
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Status changes, contacts, follow-ups, and imports.</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing yet — add an application to start the timeline.</p>
            ) : (
              <ol className="space-y-3">
                {activity.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/70" />
                    <div className="min-w-0">
                      <Link
                        href={`/applications/${item.application_id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {item.company}
                        <span className="text-muted-foreground"> · {item.role}</span>
                      </Link>
                      <p className="text-sm text-muted-foreground">{item.message}</p>
                      <p className="text-xs text-muted-foreground/80">{formatDateTime(item.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  warn,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: string;
  warn?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="font-heading mt-1 text-2xl tabular-nums">{value}</CardTitle>
        </div>
        <span
          className={`flex size-8 items-center justify-center rounded-lg ${
            warn ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </span>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
    </Card>
  );
}

function FollowUpRow({
  application_id,
  company,
  role,
  due_at,
  overdue,
}: {
  application_id: string;
  company: string;
  role: string;
  due_at: string;
  overdue?: boolean;
}) {
  return (
    <Link
      href={`/applications/${application_id}`}
      className="flex items-start justify-between gap-3 rounded-lg px-1 py-1 hover:bg-muted/60"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{company}</p>
        <p className="truncate text-xs text-muted-foreground">{role}</p>
      </div>
      <span
        className={`shrink-0 text-xs tabular-nums ${
          overdue ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground"
        }`}
      >
        {overdue ? "Overdue · " : ""}
        {formatDate(due_at)}
        <ArrowUpRight className="ml-1 inline size-3" />
      </span>
    </Link>
  );
}

