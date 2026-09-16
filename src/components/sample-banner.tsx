import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { clearSampleAction, seedSampleAction } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { FlaskConical } from "lucide-react";

export function SampleBanner({ sampleCount, empty }: { sampleCount: number; empty: boolean }) {
  if (empty) {
    return (
      <Alert className="border-dashed bg-card">
        <FlaskConical />
        <AlertTitle>Start with a live board or sample data</AlertTitle>
        <AlertDescription>
          Add a real application, or load the SAMPLE set (15 fictional roles across
          global boards and ATS vendors, overdue/today/week follow-ups). Sample rows
          are tagged and can be cleared without touching your own data.
        </AlertDescription>
        <form action={seedSampleAction} className="mt-3">
          <SubmitButton>Load SAMPLE data</SubmitButton>
        </form>
      </Alert>
    );
  }

  if (sampleCount === 0) return null;

  return (
    <Alert className="bg-amber-500/8">
      <FlaskConical />
      <AlertTitle>SAMPLE data is on this board</AlertTitle>
      <AlertDescription>
        {sampleCount} demo application{sampleCount === 1 ? "" : "s"} are tagged as sample.
        Clear them anytime — your non-sample rows stay put.
      </AlertDescription>
      <div className="mt-3 flex flex-wrap gap-2">
        <form action={clearSampleAction}>
          <SubmitButton variant="outline">Clear SAMPLE data</SubmitButton>
        </form>
        <form action={seedSampleAction}>
          <SubmitButton variant="ghost">Reload SAMPLE set</SubmitButton>
        </form>
      </div>
    </Alert>
  );
}
