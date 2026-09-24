import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { promoteOpportunityAction, setOpportunityStatusAction } from "@/lib/opportunity-actions";
import type { OpportunityStatus } from "@/lib/types";

const ACTIONS: {
  status: Exclude<OpportunityStatus, "promoted">;
  label: string;
  compact: string;
  variant: "outline" | "secondary" | "ghost";
}[] = [
  { status: "worth_a_look", label: "Worth a look", compact: "Look", variant: "outline" },
  { status: "draft_ready", label: "Draft ready", compact: "Draft", variant: "secondary" },
  { status: "skipped", label: "Skip", compact: "Skip", variant: "ghost" },
];

export function OpportunityTriage({
  id,
  status,
  applicationId,
  compact = false,
}: {
  id: string;
  status: OpportunityStatus;
  applicationId?: string | null;
  compact?: boolean;
}) {
  if (compact && status === "promoted" && applicationId) {
    return (
      <Button asChild size="xs" variant="outline">
        <Link href={`/applications/${applicationId}`}>Application</Link>
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ACTIONS.filter((action) => action.status !== status).map((action) => (
        <form key={action.status} action={setOpportunityStatusAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={action.status} />
          <SubmitButton variant={action.variant} size={compact ? "xs" : "sm"}>
            {compact ? action.compact : action.label}
          </SubmitButton>
        </form>
      ))}
      {applicationId ? (
        <Button asChild size={compact ? "xs" : "sm"} variant="outline">
          <Link href={`/applications/${applicationId}`}>
            {compact ? "Application" : "Open application"}
          </Link>
        </Button>
      ) : null}
      {status !== "promoted" ? (
        <form action={promoteOpportunityAction.bind(null, id)}>
          <SubmitButton size={compact ? "xs" : "sm"}>
            {compact ? "Promote" : "Promote to application"}
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
