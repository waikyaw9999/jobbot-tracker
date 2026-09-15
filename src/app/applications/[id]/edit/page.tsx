import { notFound } from "next/navigation";
import { ApplicationForm } from "@/components/application-form";
import { getApplication } from "@/lib/queries";

export default async function EditApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await getApplication(id);
  if (!app) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="font-heading text-3xl tracking-tight">Edit {app.company}</h1>
        <p className="text-sm text-muted-foreground">{app.role}</p>
      </header>
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <ApplicationForm application={app} />
      </div>
    </div>
  );
}
