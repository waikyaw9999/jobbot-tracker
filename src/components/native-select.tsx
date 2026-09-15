import { cn } from "@/lib/utils";
import { PLATFORMS, STATUSES, type Platform, type Status } from "@/lib/constants";

export function NativeSelect({
  className,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30",
        className
      )}
      {...props}
    />
  );
}

export function PlatformSelect({
  name = "platform",
  defaultValue,
  includeAll,
  id,
}: {
  name?: string;
  defaultValue?: string;
  includeAll?: boolean;
  id?: string;
}) {
  return (
    <NativeSelect name={name} id={id} defaultValue={defaultValue ?? (includeAll ? "all" : "linkedin")}>
      {includeAll ? <option value="all">All platforms</option> : null}
      {PLATFORMS.map((p) => (
        <option key={p.value} value={p.value}>
          {p.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function StatusSelect({
  name = "status",
  defaultValue,
  includeAll,
  id,
}: {
  name?: string;
  defaultValue?: string;
  includeAll?: boolean;
  id?: string;
}) {
  return (
    <NativeSelect name={name} id={id} defaultValue={defaultValue ?? (includeAll ? "all" : "saved")}>
      {includeAll ? <option value="all">All statuses</option> : null}
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </NativeSelect>
  );
}

export function statusTone(status: Status | string) {
  const tone = STATUSES.find((s) => s.value === status)?.tone ?? "muted";
  switch (tone) {
    case "info":
      return "bg-sky-500/12 text-sky-800 ring-sky-500/20 dark:text-sky-200";
    case "warn":
      return "bg-amber-500/14 text-amber-900 ring-amber-500/20 dark:text-amber-200";
    case "success":
      return "bg-emerald-500/14 text-emerald-900 ring-emerald-500/20 dark:text-emerald-200";
    case "danger":
      return "bg-rose-500/12 text-rose-800 ring-rose-500/20 dark:text-rose-200";
    default:
      return "bg-muted text-muted-foreground ring-foreground/10";
  }
}

export function platformTone(_platform: Platform | string) {
  return "bg-secondary text-secondary-foreground ring-foreground/10";
}
