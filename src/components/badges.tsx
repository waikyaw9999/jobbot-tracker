import { Badge } from "@/components/ui/badge";
import { atsLabel } from "@/lib/ats";
import { opportunityStatusLabel, opportunityStatusTone } from "@/lib/assist";
import { platformLabel, statusLabel } from "@/lib/constants";
import { atsTone, platformTone, statusTone, toneClass } from "@/components/native-select";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent ring-1 capitalize", statusTone(status))}
    >
      {statusLabel(status)}
    </Badge>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent ring-1", platformTone(platform))}
    >
      {platformLabel(platform)}
    </Badge>
  );
}

export function OpportunityStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent ring-1", toneClass(opportunityStatusTone(status)))}
    >
      {opportunityStatusLabel(status)}
    </Badge>
  );
}

export function FitBadge({ fit }: { fit: string | null | undefined }) {
  if (!fit) return <span className="text-sm text-muted-foreground">—</span>;
  const tone =
    fit.toLowerCase() === "excellent"
      ? "success"
      : fit.toLowerCase() === "strong"
        ? "info"
        : fit.toLowerCase() === "good"
          ? "warn"
          : "muted";
  return (
    <Badge variant="outline" className={cn("border-transparent ring-1", toneClass(tone))}>
      {fit}
    </Badge>
  );
}

export function AtsBadge({ ats }: { ats: string | null | undefined }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-transparent ring-1", atsTone(ats))}
    >
      {atsLabel(ats)}
    </Badge>
  );
}
