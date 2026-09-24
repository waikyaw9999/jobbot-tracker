import Link from "next/link";
import { FitBadge, OpportunityStatusBadge, PlatformBadge } from "@/components/badges";
import { OpportunityTriage } from "@/components/opportunity-triage";
import { NativeSelect, PlatformSelect } from "@/components/native-select";
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
import {
  isOpportunityStatus,
  marketChips,
  OPPORTUNITY_STATUSES,
  opportunityStatusLabel,
  parseSourceList,
} from "@/lib/assist";
import { isPlatform, platformLabel, type Platform } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { getOpportunityCounts, getSearchPreferences, listOpportunities } from "@/lib/opportunity-queries";
import type { OpportunityStatus } from "@/lib/types";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; source?: string; market?: string }>;
}) {
  const params = await searchParams;
  const q = params.q ?? "";
  const status =
    params.status && isOpportunityStatus(params.status)
      ? (params.status as OpportunityStatus)
      : "all";
  const source =
    params.source && isPlatform(params.source) ? (params.source as Platform) : "all";
  const market = params.market ?? "";
  const [opportunities, counts, preferences] = await Promise.all([
    listOpportunities({ q, status, source, market }),
    getOpportunityCounts(),
    getSearchPreferences(),
  ]);
  const chips = marketChips(preferences.markets);
  const preferred = parseSourceList(preferences.sources)
    .map((value) => platformLabel(value))
    .join(", ");

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl tracking-tight">Opportunities</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {opportunities.length} showing · {counts.total} saved. Research and drafts only —
            promoting creates a Saved application and does not email or apply.
          </p>
          {preferred ? (
            <p className="mt-1 text-xs text-muted-foreground">Watching {preferred}.</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/opportunities/preferences">Assist profile</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/opportunities/import">Import digest</Link>
          </Button>
          <Button asChild>
            <Link href="/opportunities/new">Add opportunity</Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <CountLink label="All" count={counts.total} href={href({ q, source, market })} active={status === "all"} />
        {OPPORTUNITY_STATUSES.map((item) => (
          <CountLink
            key={item.value}
            label={item.label}
            count={counts[item.value]}
            href={href({ q, status: item.value, source, market })}
            active={status === item.value}
          />
        ))}
      </div>

      <form className="grid gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-6">
        <Input
          name="q"
          placeholder="Search role, company, visa, draft…"
          defaultValue={q}
          className="lg:col-span-2"
        />
        <NativeStatus status={status} />
        <PlatformSelect name="source" includeAll defaultValue={source} />
        <Input name="market" placeholder="Market or city" defaultValue={market} />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {chips.length ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const active = market.toLowerCase() === chip.query.toLowerCase();
            return (
              <Link
                key={chip.query}
                href={href({
                  q,
                  status,
                  source,
                  market: active ? "" : chip.query,
                })}
                className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-foreground/10 ${
                  active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                }`}
              >
                {chip.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      {opportunities.length === 0 ? (
        <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <p className="text-sm text-muted-foreground">
            No opportunities match. Import a JobAlertsWatch-style digest, or add a role from a URL.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/opportunities/new">Add opportunity</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/opportunities/import">Import digest</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Fit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Found</TableHead>
                  <TableHead>Triage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opportunity) => (
                  <TableRow key={opportunity.id}>
                    <TableCell>
                      <Link href={`/opportunities/${opportunity.id}`} className="hover:underline">
                        <span className="font-medium">{opportunity.company}</span>
                        <span className="block text-muted-foreground">{opportunity.title}</span>
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[opportunity.location, opportunity.visa_note].filter(Boolean).join(" · ") || "—"}
                        {opportunity.duplicate ? (
                          <span className="ml-2 text-amber-800 dark:text-amber-200">Possible duplicate</span>
                        ) : null}
                      </p>
                    </TableCell>
                    <TableCell>
                      <PlatformBadge platform={opportunity.source} />
                    </TableCell>
                    <TableCell>
                      <FitBadge fit={opportunity.fit} />
                    </TableCell>
                    <TableCell>
                      <OpportunityStatusBadge status={opportunity.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(opportunity.discovered_at)}
                    </TableCell>
                    <TableCell>
                      <OpportunityTriage
                        id={opportunity.id}
                        status={opportunity.status}
                        applicationId={opportunity.application_id}
                        compact
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 lg:hidden">
            {opportunities.map((opportunity) => (
              <div key={opportunity.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/opportunities/${opportunity.id}`}>
                    <p className="font-medium">{opportunity.company}</p>
                    <p className="text-sm text-muted-foreground">{opportunity.title}</p>
                  </Link>
                  <OpportunityStatusBadge status={opportunity.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <PlatformBadge platform={opportunity.source} />
                  <FitBadge fit={opportunity.fit} />
                  <span className="text-xs text-muted-foreground">
                    {[opportunity.location, opportunity.visa_note].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {opportunity.duplicate ? (
                  <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">Possible duplicate</p>
                ) : null}
                <div className="mt-3">
                  <OpportunityTriage
                    id={opportunity.id}
                    status={opportunity.status}
                    applicationId={opportunity.application_id}
                    compact
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CountLink({
  label,
  count,
  href,
  active,
}: {
  label: string;
  count: number;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-2.5 py-1 text-xs ring-1 ring-foreground/10 ${
        active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
      }`}
    >
      {label}
      <span className="ml-1 tabular-nums">{count}</span>
    </Link>
  );
}

function NativeStatus({ status }: { status: OpportunityStatus | "all" }) {
  return (
    <NativeSelect name="status" defaultValue={status}>
      <option value="all">All statuses</option>
      {OPPORTUNITY_STATUSES.map((item) => (
        <option key={item.value} value={item.value}>
          {opportunityStatusLabel(item.value)}
        </option>
      ))}
    </NativeSelect>
  );
}

function href(input: {
  q?: string;
  status?: OpportunityStatus | "all";
  source?: Platform | "all";
  market?: string;
}) {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.status && input.status !== "all") params.set("status", input.status);
  if (input.source && input.source !== "all") params.set("source", input.source);
  if (input.market) params.set("market", input.market);
  const query = params.toString();
  return query ? `/opportunities?${query}` : "/opportunities";
}
