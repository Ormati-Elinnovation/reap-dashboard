import { buildPivot, monthTotals } from "@/lib/pivot";
import { deriveMonths, monthLabel, partialMonth } from "@/lib/months";
import type { Transaction } from "@/lib/types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export type MonthMeta = { month: string; label: string; partial: boolean };

export function monthsMeta(rows: Transaction[]): MonthMeta[] {
  const partial = partialMonth(rows);
  return deriveMonths(rows).map((m) => ({ month: m, label: monthLabel(m), partial: m === partial }));
}

export function totalsOf(rows: Transaction[]) {
  const months = deriveMonths(rows);
  const total = rows.reduce((s, r) => s + r.amt, 0);
  return {
    total: round2(total),
    transactions: rows.length,
    months: months.length,
    monthly_avg: round2(total / (months.length || 1)),
    companies: new Set(rows.map((r) => r.company)).size,
    cards: new Set(rows.map((r) => r.card)).size,
    suppliers: new Set(rows.map((r) => r.merchant)).size,
    currency: "USD",
  };
}

export function byMonth(rows: Transaction[]) {
  const months = deriveMonths(rows);
  const totals = monthTotals(rows, months);
  const partial = partialMonth(rows);
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.month, (counts.get(r.month) ?? 0) + 1);
  return months.map((m) => ({
    month: m,
    label: monthLabel(m),
    total: round2(totals[m] ?? 0),
    transactions: counts.get(m) ?? 0,
    partial: m === partial,
  }));
}

// Two-level breakdown (e.g. company -> card, supplier -> card, tech group -> supplier),
// mirroring the pivot tables in the dashboard so numbers always match the UI.
export function breakdown(
  rows: Transaction[],
  group: keyof Transaction,
  sub: keyof Transaction | null,
  extras: (keyof Transaction)[] = []
) {
  const months = deriveMonths(rows);
  const nMon = months.length || 1;
  const groups = buildPivot(rows, group, sub ?? group, extras);
  return groups.map((g) => ({
    key: g.key,
    total: round2(g.tot),
    transactions: g.n,
    monthly_avg: round2(g.tot / nMon),
    by_month: Object.fromEntries(months.map((m) => [m, round2(g.mon[m] ?? 0)])),
    ...(sub
      ? {
          items: g.subs.map((s) => ({
            key: s.key,
            ...s.extra,
            total: round2(s.tot),
            transactions: s.n,
            monthly_avg: round2(s.tot / nMon),
            by_month: Object.fromEntries(months.map((m) => [m, round2(s.mon[m] ?? 0)])),
          })),
        }
      : {}),
  }));
}

export function largest(rows: Transaction[]) {
  if (!rows.length) return null;
  const r = rows.reduce((a, b) => (b.amt > a.amt ? b : a));
  return { date: r.date, company: r.company, card: r.card, merchant: r.merchant, amount: round2(r.amt) };
}

export function serialize(r: Transaction) {
  return { ...r, amt: round2(r.amt) };
}
