import { ApplicationForm } from "@/components/application-form";

export default function NewApplicationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="font-heading text-3xl tracking-tight">New application</h1>
        <p className="text-sm text-muted-foreground">
          Choosing Applied schedules a follow-up 7 days out if none is already open.
        </p>
      </header>
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <ApplicationForm />
      </div>
    </div>
  );
}
