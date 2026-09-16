import Link from "next/link";
import { JobUrlAndAtsFields } from "@/components/ats-fields";
import { PlatformSelect, StatusSelect } from "@/components/native-select";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createApplicationAction,
  updateApplicationAction,
} from "@/lib/actions";
import type { Application } from "@/lib/types";

export function ApplicationForm({ application }: { application?: Application }) {
  const action = application
    ? updateApplicationAction.bind(null, application.id)
    : createApplicationAction;

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" htmlFor="company">
          <Input
            id="company"
            name="company"
            required
            defaultValue={application?.company}
            placeholder="Acme"
          />
        </Field>
        <Field label="Role" htmlFor="role">
          <Input
            id="role"
            name="role"
            required
            defaultValue={application?.role}
            placeholder="Senior Engineer"
          />
        </Field>
        <Field label="Source" htmlFor="platform">
          <PlatformSelect id="platform" defaultValue={application?.platform} />
          <p className="mt-1 text-xs text-muted-foreground">
            Job board or market you found the role on.
          </p>
        </Field>
        <Field label="Status" htmlFor="status">
          <StatusSelect id="status" defaultValue={application?.status} />
        </Field>
        <JobUrlAndAtsFields
          defaultUrl={application?.job_url}
          defaultAts={application?.ats}
        />
        <Field label="Applied on" htmlFor="applied_at">
          <Input
            id="applied_at"
            name="applied_at"
            type="date"
            defaultValue={application?.applied_at ?? ""}
          />
        </Field>
        <Field label="Location" htmlFor="location">
          <Input
            id="location"
            name="location"
            defaultValue={application?.location ?? ""}
            placeholder="Remote · NYC · Berlin · Dubai"
          />
        </Field>
        <Field label="Salary min" htmlFor="salary_min">
          <Input
            id="salary_min"
            name="salary_min"
            type="number"
            min={0}
            defaultValue={application?.salary_min ?? ""}
          />
        </Field>
        <Field label="Salary max" htmlFor="salary_max">
          <Input
            id="salary_max"
            name="salary_max"
            type="number"
            min={0}
            defaultValue={application?.salary_max ?? ""}
          />
        </Field>
        <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
          <Textarea
            id="notes"
            name="notes"
            rows={5}
            defaultValue={application?.notes ?? ""}
            placeholder="Prep notes, referral context, compensation details…"
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton>{application ? "Save changes" : "Create application"}</SubmitButton>
        <Link
          href={application ? `/applications/${application.id}` : "/applications"}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
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
