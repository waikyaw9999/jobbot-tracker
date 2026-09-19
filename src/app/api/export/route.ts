import { applicationsToCsv } from "@/lib/csv";
import { listApplications } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const csv = applicationsToCsv(await listApplications());
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jobbot-applications.csv"',
    },
  });
}
