"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isPlatform,
  isStatus,
  type Platform,
  type Status,
} from "@/lib/constants";
import { csvToApplications } from "@/lib/csv";
import {
  completeFollowUp,
  deleteApplication,
  deleteContact,
  deleteFollowUp,
  insertApplication,
  insertContact,
  insertFollowUp,
  updateApplication,
  updateApplicationStatus,
} from "@/lib/queries";
import { seedSampleData } from "@/lib/seed";
import { clearSampleData } from "@/lib/queries";
import type { ApplicationInput } from "@/lib/types";

function revalidateAll() {
  revalidatePath("/", "layout");
}

function readInput(formData: FormData): ApplicationInput {
  const company = String(formData.get("company") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const platform = String(formData.get("platform") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!company || !role) throw new Error("Company and role are required");
  if (!isPlatform(platform)) throw new Error("Invalid platform");
  if (!isStatus(status)) throw new Error("Invalid status");

  const salaryMin = String(formData.get("salary_min") ?? "").trim();
  const salaryMax = String(formData.get("salary_max") ?? "").trim();

  return {
    company,
    role,
    platform: platform as Platform,
    status: status as Status,
    location: String(formData.get("location") ?? "").trim() || null,
    job_url: String(formData.get("job_url") ?? "").trim() || null,
    salary_min: salaryMin ? Number(salaryMin) : null,
    salary_max: salaryMax ? Number(salaryMax) : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    applied_at: String(formData.get("applied_at") ?? "").trim() || null,
  };
}

export async function createApplicationAction(formData: FormData) {
  const id = await insertApplication(readInput(formData));
  revalidateAll();
  redirect(`/applications/${id}`);
}

export async function updateApplicationAction(id: string, formData: FormData) {
  await updateApplication(id, readInput(formData));
  revalidateAll();
  redirect(`/applications/${id}`);
}

export async function updateStatusAction(id: string, status: Status) {
  if (!isStatus(status)) throw new Error("Invalid status");
  await updateApplicationStatus(id, status);
  revalidateAll();
}

export async function deleteApplicationAction(id: string) {
  await deleteApplication(id);
  revalidateAll();
  redirect("/applications");
}

export async function addFollowUpAction(applicationId: string, formData: FormData) {
  const dueAt = String(formData.get("due_at") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (!dueAt) throw new Error("Due date is required");
  await insertFollowUp(applicationId, dueAt, note || null);
  revalidateAll();
}

export async function completeFollowUpAction(id: string) {
  await completeFollowUp(id);
  revalidateAll();
}

export async function deleteFollowUpAction(id: string) {
  await deleteFollowUp(id);
  revalidateAll();
}

export async function addContactAction(applicationId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");
  await insertContact(applicationId, {
    name,
    title: String(formData.get("title") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    linkedin_url: String(formData.get("linkedin_url") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidateAll();
}

export async function deleteContactAction(id: string) {
  await deleteContact(id);
  revalidateAll();
}

export async function seedSampleAction() {
  await seedSampleData();
  revalidateAll();
}

export async function clearSampleAction() {
  await clearSampleData();
  revalidateAll();
}

export async function importCsvAction(
  _prev: { ok: boolean; message: string } | null,
  formData: FormData
) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a CSV file to import." };
  }
  const text = await file.text();
  const { rows, errors } = csvToApplications(text);
  if (!rows.length) {
    return {
      ok: false,
      message: errors[0] ?? "No valid rows found in CSV.",
    };
  }
  for (const row of rows) {
    await insertApplication(row);
  }
  revalidateAll();
  const extra = errors.length ? ` ${errors.length} row(s) skipped.` : "";
  return {
    ok: true,
    message: `Imported ${rows.length} application${rows.length === 1 ? "" : "s"}.${extra}`,
  };
}
