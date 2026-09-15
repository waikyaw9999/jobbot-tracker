import Link from "next/link";
import { SubmitButton } from "@/components/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { deleteContactAction } from "@/lib/actions";
import { listContacts } from "@/lib/queries";
import type { ContactWithApp } from "@/lib/types";

export default function ContactsPage() {
  const contacts = listContacts() as ContactWithApp[];

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-3xl tracking-tight">Contacts</h1>
        <p className="text-sm text-muted-foreground">
          Recruiters, hiring managers, and referrals attached to applications.
        </p>
      </header>
      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No contacts yet. Open an application to add one.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((person) => (
            <Card key={person.id}>
              <CardHeader>
                <CardTitle>{person.name}</CardTitle>
                <CardDescription>
                  {person.title || "Contact"} ·{" "}
                  <Link href={`/applications/${person.application_id}`} className="hover:underline">
                    {person.company}
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground">{person.role}</p>
                {person.email ? (
                  <a className="block hover:underline" href={`mailto:${person.email}`}>
                    {person.email}
                  </a>
                ) : null}
                {person.phone ? <p>{person.phone}</p> : null}
                {person.linkedin_url ? (
                  <a
                    href={person.linkedin_url}
                    className="block text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    LinkedIn
                  </a>
                ) : null}
                {person.notes ? <p className="text-muted-foreground">{person.notes}</p> : null}
                <form action={deleteContactAction.bind(null, person.id)} className="pt-2">
                  <SubmitButton variant="ghost">Remove</SubmitButton>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
