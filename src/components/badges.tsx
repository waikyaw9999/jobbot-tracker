import { Badge } from "@/components/ui/badge";
import { atsLabel } from "@/lib/ats";
import { platformLabel, statusLabel } from "@/lib/constants";
import { atsTone, platformTone, statusTone } from "@/components/native-select";
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
