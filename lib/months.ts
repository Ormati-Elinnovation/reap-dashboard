import { HEB_MONTHS, type Transaction } from "./types";

export function deriveMonths(rows: Transaction[]): string[] {
  return Array.from(new Set(rows.map((r) => r.month))).sort();
}

export function monthLabel(mo: string): string {
  return HEB_MONTHS[mo.slice(5, 7)] ?? mo;
}

// Latest month is "partial" if the max date in the data falls before day 28.
export function partialMonth(rows: Transaction[]): string | null {
  if (!rows.length) return null;
  const maxDate = rows.reduce((a, r) => (r.date > a ? r.date : a), rows[0].date);
  const months = deriveMonths(rows);
  const last = months[months.length - 1];
  return maxDate.slice(8, 10) < "28" ? last : null;
}
