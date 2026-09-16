import Link from "next/link";
import { ApplicationBoard } from "@/components/application-board";
import { AtsBadge, PlatformBadge, StatusBadge } from "@/components/badges";
import { AtsSelect, PlatformSelect, StatusSelect } from "@/components/native-select";
import { SampleBanner } from "@/components/sample-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isAts, type AtsVendor } from "@/lib/ats";
import { isPlatform, isStatus, type Platform, type Status } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { countSampleApplications, listApplications } from "@/lib/queries";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    platform?: string;
    ats?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status =
    params.status && isStatus(params.status) ? (params.status as Status) : "all";
  const platform =
    params.platform && isPlatform(params.platform)
      ? (params.platform as Platform)
      : "all";
  const ats =
    params.ats && isAts(params.ats) ? (params.ats as AtsVendor) : "all";
  const view = params.view === "board" ? "board" : "list";

  const applications = await listApplications({
    q,
    status,
    platform,
    ats,
  });
  const sampleCount = await countSampleApplications();
  const emptyFilters = !q && status === "all" && platform === "all" && ats === "all";

  const listHref = applicationsHref({ q, status, platform, ats, view: "list" });
  const boardHref = applicationsHref({ q, status, platform, ats, view: "board" });

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">Applications</h1>
          <p className="text-sm text-muted-foreground">
            {applications.length} matching · filter by source or ATS
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-card p-0.5 ring-1 ring-foreground/10">
            <Button asChild size="sm" variant={view === "list" ? "secondary" : "ghost"}>
              <Link href={listHref}>List</Link>
            </Button>
            <Button asChild size="sm" variant={view === "board" ? "secondary" : "ghost"}>
              <Link href={boardHref}>Board</Link>
            </Button>
          </div>
          <Button asChild>
            <Link href="/applications/new">New application</Link>
          </Button>
        </div>
      </header>

      <SampleBanner sampleCount={sampleCount} empty={applications.length === 0 && emptyFilters} />

      <form className="grid gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-6">
        {view === "board" ? <input type="hidden" name="view" value="board" /> : null}
        <Input
          name="q"
          placeholder="Search company, role, notes…"
          defaultValue={q}
          className="lg:col-span-2"
        />
        <StatusSelect name="status" includeAll defaultValue={status} />
        <PlatformSelect name="platform" includeAll defaultValue={platform} />
        <AtsSelect name="ats" includeAll defaultValue={ats} />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {applications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No applications match those filters.</p>
      ) : view === "board" ? (
        <ApplicationBoard applications={applications} />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company / role</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>ATS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <Link href={`/applications/${app.id}`} className="block hover:underline">
                        <span className="font-medium">
                          {app.company}
                          {app.is_sample ? (
                            <span className="ml-2 text-[10px] tracking-wide text-amber-700 uppercase dark:text-amber-300">
                              SAMPLE
                            </span>
                          ) : null}
                        </span>
                        <span className="block text-muted-foreground">{app.role}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={app.platform} />
                    </TableCell>
                    <TableCell>
                      <AtsBadge ats={app.ats} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(app.applied_at)}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">
                      {app.location ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="rounded-xl bg-card p-4 ring-1 ring-foreground/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {app.company}
                      {app.is_sample ? (
                        <span className="ml-2 text-[10px] tracking-wide text-amber-700 uppercase dark:text-amber-300">
                          SAMPLE
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">{app.role}</p>
                  </div>
                  <StatusBadge status={app.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <PlatformBadge platform={app.platform} />
                  <AtsBadge ats={app.ats} />
                  <span className="text-xs text-muted-foreground">{formatDate(app.applied_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function applicationsHref({
  q,
  status,
  platform,
  ats,
  view,
}: {
  q: string;
  status: string;
  platform: string;
  ats: string;
  view: "list" | "board";
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status !== "all") params.set("status", status);
  if (platform !== "all") params.set("platform", platform);
  if (ats !== "all") params.set("ats", ats);
  if (view === "board") params.set("view", "board");
  const query = params.toString();
  return query ? `/applications?${query}` : "/applications";
}
