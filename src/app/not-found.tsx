import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="space-y-3 py-16 text-center">
      <h1 className="font-heading text-3xl">Not found</h1>
      <p className="text-sm text-muted-foreground">That page or application is not in this local database.</p>
      <Button asChild>
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
