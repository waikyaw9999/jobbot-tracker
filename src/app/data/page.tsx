import Link from "next/link";
import { CsvImportForm } from "@/components/csv-import-form";
import { SampleBanner } from "@/components/sample-banner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CSV_HEADERS } from "@/lib/csv";
import { countSampleApplications, listApplications } from "@/lib/queries";

export default async function DataPage() {
  const total = (await listApplications()).length;
  const sampleCount = await countSampleApplications();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl tracking-tight">Import / Export</h1>
        <p className="text-sm text-muted-foreground">
          CSV round-trip for applications. Job-alert digests belong in{" "}
          <Link href="/opportunities/import" className="underline-offset-4 hover:underline">
            Opportunities → Import digest
          </Link>
          . Nothing leaves this machine.
        </p>
      </header>

      <SampleBanner sampleCount={sampleCount} empty={total === 0} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Export</CardTitle>
            <CardDescription>
              Download all {total} application{total === 1 ? "" : "s"} as CSV.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/api/export">Download CSV</a>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Import</CardTitle>
            <CardDescription>
              Columns: {CSV_HEADERS.join(", ")}. Company and role are required.
              Older CSVs without <code className="text-xs">ats</code> still import —
              ATS is inferred from the job URL or left as Unknown.{" "}
              <code className="text-xs">ats_vendor</code> is accepted as an alias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvImportForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
