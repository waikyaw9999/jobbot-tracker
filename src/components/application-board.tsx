import Link from "next/link";
import { AtsBadge, PlatformBadge, StatusBadge } from "@/components/badges";
import { statusLabel, TERMINAL_STATUSES, type Status } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import type { Application } from "@/lib/types";

const BOARD_COLUMNS: { status: Status; hint: string }[] = [
  { status: "saved", hint: "Not sent" },
  { status: "applied", hint: "In ATS" },
  { status: "recruiter_screen", hint: "Recruiter" },
  { status: "hiring_manager", hint: "HM" },
  { status: "interview", hint: "Loop" },
  { status: "offer", hint: "Decision" },
];

export function ApplicationBoard({ applications }: { applications: Application[] }) {
  const closed = applications.filter((app) =>
    TERMINAL_STATUSES.includes(app.status)
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-3 overflow-x-auto pb-1">
        {BOARD_COLUMNS.map((column) => {
          const items = applications.filter((app) => app.status === column.status);
          return (
            <section
              key={column.status}
              className="flex w-64 shrink-0 flex-col rounded-xl bg-card ring-1 ring-foreground/10"
            >
              <header className="flex items-baseline justify-between gap-2 px-3 py-2.5">
                <div>
                  <h2 className="text-sm font-medium">{statusLabel(column.status)}</h2>
                  <p className="text-[11px] text-muted-foreground">{column.hint}</p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
              </header>
              <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                {items.length === 0 ? (
                  <p className="rounded-lg bg-muted/40 px-2 py-6 text-center text-xs text-muted-foreground">
                    Empty
                  </p>
                ) : (
                  items.map((app) => <BoardCard key={app.id} app={app} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
      {closed.length > 0 ? (
        <section className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
          <h2 className="text-sm font-medium">Closed</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Accepted, rejected, withdrawn, and ghosted.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {closed.map((app) => (
              <BoardCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function BoardCard({ app }: { app: Application }) {
  return (
    <Link
      href={`/applications/${app.id}`}
      className="block rounded-lg bg-muted/45 p-2.5 ring-1 ring-foreground/6 hover:bg-muted/70"
    >
      <p className="truncate text-sm font-medium">
        {app.company}
        {app.is_sample ? (
          <span className="ml-1 text-[10px] tracking-wide text-amber-700 uppercase dark:text-amber-300">
            SAMPLE
          </span>
        ) : null}
      </p>
      <p className="truncate text-xs text-muted-foreground">{app.role}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <PlatformBadge platform={app.platform} />
        <AtsBadge ats={app.ats} />
        {TERMINAL_STATUSES.includes(app.status) ? <StatusBadge status={app.status} /> : null}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{formatDate(app.applied_at)}</p>
    </Link>
  );
}
