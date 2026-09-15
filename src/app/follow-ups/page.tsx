import Link from "next/link";
import { StatusBadge } from "@/components/badges";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { completeFollowUpAction } from "@/lib/actions";
import { formatDate } from "@/lib/dates";
import { bucketFollowUps, listOpenFollowUps } from "@/lib/queries";
import type { FollowUpWithApp } from "@/lib/types";

export default async function FollowUpsPage() {
  const buckets = bucketFollowUps(await listOpenFollowUps());

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl tracking-tight">Follow-ups</h1>
        <p className="text-sm text-muted-foreground">
          Overdue, today, and this week. Applied applications get a 7-day follow-up
          automatically.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        <FollowUpGroup title="Overdue" description="Ping these first" items={buckets.overdue} tone="danger" />
        <FollowUpGroup title="Today" description="Due now" items={buckets.today} tone="warn" />
        <FollowUpGroup title="This week" description="Next 7 days" items={buckets.week} />
        <FollowUpGroup title="Later" description="On the horizon" items={buckets.later} />
      </div>
    </div>
  );
}

function FollowUpGroup({
  title,
  description,
  items,
  tone,
}: {
  title: string;
  description: string;
  items: FollowUpWithApp[];
  tone?: "danger" | "warn";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <span
            className={`text-sm tabular-nums ${
              tone === "danger"
                ? "text-rose-700 dark:text-rose-300"
                : tone === "warn"
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-muted-foreground"
            }`}
          >
            {items.length}
          </span>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing here.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/applications/${item.application_id}`} className="font-medium hover:underline">
                    {item.company}
                  </Link>
                  <p className="text-sm text-muted-foreground">{item.role}</p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{formatDate(item.due_at)}</span>
              </div>
              <p className="mt-1 text-sm">{item.note || "Follow up"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                <form action={completeFollowUpAction.bind(null, item.id)}>
                  <SubmitButton variant="secondary">Mark done</SubmitButton>
                </form>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/applications/${item.application_id}`}>Open</Link>
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
