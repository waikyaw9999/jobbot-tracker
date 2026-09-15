import { PIPELINE_STATUSES, STATUSES, TERMINAL_STATUSES } from "@/lib/constants";
import { updateStatusAction } from "@/lib/actions";
import type { Status } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function StatusPipeline({
  applicationId,
  current,
}: {
  applicationId: string;
  current: Status;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PIPELINE_STATUSES.map((status, index) => {
          const currentIndex = PIPELINE_STATUSES.indexOf(
            PIPELINE_STATUSES.includes(current) ? current : "saved"
          );
          const reached = PIPELINE_STATUSES.includes(current)
            ? index <= currentIndex
            : false;
          const active = status === current;
          return (
            <form key={status} action={updateStatusAction.bind(null, applicationId, status)}>
              <button
                type="submit"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs ring-1 transition-colors",
                  active
                    ? "bg-primary text-primary-foreground ring-primary"
                    : reached
                      ? "bg-primary/12 text-foreground ring-primary/20"
                      : "bg-muted text-muted-foreground ring-foreground/8 hover:bg-accent"
                )}
              >
                {STATUSES.find((s) => s.value === status)?.label}
              </button>
            </form>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TERMINAL_STATUSES.map((status) => {
          const active = status === current;
          return (
            <form key={status} action={updateStatusAction.bind(null, applicationId, status)}>
              <button
                type="submit"
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs ring-1 transition-colors",
                  active
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-muted text-muted-foreground ring-foreground/8 hover:bg-accent"
                )}
              >
                {STATUSES.find((s) => s.value === status)?.label}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
