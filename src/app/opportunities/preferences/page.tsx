import Link from "next/link";
import { PreferencesForm } from "@/components/preferences-form";
import { getSearchPreferences } from "@/lib/opportunity-queries";

export default async function PreferencesPage() {
  const preferences = await getSearchPreferences();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">
          <Link href="/opportunities" className="hover:underline">
            Opportunities
          </Link>
          <span> / Assist profile</span>
        </p>
        <h1 className="font-heading text-3xl tracking-tight">Search preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Titles, markets, sources, and stack keywords for fit hints. Saved in the same
          SQLite or Turso database as your applications. JobBot does not scrape boards or
          send applications from this profile.
        </p>
      </header>
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
        <PreferencesForm preferences={preferences} />
      </div>
    </div>
  );
}
