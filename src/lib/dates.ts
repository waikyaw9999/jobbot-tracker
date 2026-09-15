import { addDays, format, isValid, parseISO } from "date-fns";

export function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

export function nowIso() {
  return new Date().toISOString();
}

export function addDaysIso(days: number, from = new Date()) {
  return format(addDays(from, days), "yyyy-MM-dd");
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = parseFlexible(value);
  if (!parsed) return value;
  return format(parsed, "MMM d, yyyy");
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = parseFlexible(value);
  if (!parsed) return value;
  return format(parsed, "MMM d, yyyy · h:mm a");
}

export function parseFlexible(value: string) {
  const iso = parseISO(value);
  if (isValid(iso)) return iso;
  const dateOnly = parseISO(`${value}T00:00:00`);
  if (isValid(dateOnly)) return dateOnly;
  return null;
}

export function weekAheadIso() {
  return addDaysIso(7);
}
