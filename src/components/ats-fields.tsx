"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { ATS_VENDORS, atsLabel, detectAtsFromUrl, regionSummary } from "@/lib/ats";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function JobUrlAndAtsFields({
  defaultUrl,
  defaultAts,
}: {
  defaultUrl?: string | null;
  defaultAts?: string | null;
}) {
  const startedUnknown = !defaultAts || defaultAts === "unknown";
  const [url, setUrl] = useState(defaultUrl ?? "");
  const [ats, setAts] = useState(defaultAts || "unknown");
  const [autoFilled, setAutoFilled] = useState(false);
  const [locked, setLocked] = useState(!startedUnknown);

  function applyUrl(next: string) {
    setUrl(next);
    if (locked) return;
    const detected = detectAtsFromUrl(next);
    if (detected) {
      setAts(detected);
      setAutoFilled(true);
    }
  }

  function applyAts(next: string) {
    setAts(next);
    setLocked(true);
    setAutoFilled(false);
  }

  const detected = detectAtsFromUrl(url);

  return (
    <>
      <Field label="Job URL" htmlFor="job_url" className="sm:col-span-2">
        <Input
          id="job_url"
          name="job_url"
          type="url"
          value={url}
          onChange={(event) => applyUrl(event.target.value)}
          placeholder="https://boards.greenhouse.io/…"
        />
        {detected && autoFilled ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Detected {atsLabel(detected)} from the URL. You can override the ATS.
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Known portals (Greenhouse, Workday, Lever, Ashby, Personio, …) pre-fill ATS.
          </p>
        )}
      </Field>
      <Field label="ATS" htmlFor="ats">
        <AtsCombobox id="ats" name="ats" value={ats} onChange={applyAts} />
      </Field>
    </>
  );
}

export function AtsCombobox({
  id,
  name = "ats",
  value,
  onChange,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ATS_VENDORS;
    return ATS_VENDORS.filter((item) => {
      const hay = `${item.label} ${item.value} ${item.regions.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          className={cn(
            "flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-left text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          )}
        >
          <span className="truncate">{atsLabel(value)}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ATS, region…"
            autoComplete="off"
          />
          <ScrollArea className="mt-2 h-56">
            <ul className="grid gap-0.5 pr-2">
              {filtered.length === 0 ? (
                <li className="px-2 py-3 text-sm text-muted-foreground">No ATS matches.</li>
              ) : (
                filtered.map((item) => {
                  const selected = item.value === value;
                  return (
                    <li key={item.value}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(item.value);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                          selected && "bg-muted"
                        )}
                      >
                        <Check
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            selected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="min-w-0">
                          <span className="block truncate">{item.label}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {regionSummary(item.regions)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} className="mb-1.5">
        {label}
      </Label>
      {children}
    </div>
  );
}
