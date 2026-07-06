import type { Transaction } from "./types";

export type PivotSub = {
  key: string;
  mon: Record<string, number>;
  tot: number;
  n: number;
  extra: Record<string, string>;
};
export type PivotGroup = {
  key: string;
  mon: Record<string, number>;
  tot: number;
  n: number;
  subs: PivotSub[];
};

// Generic two-level pivot: group by groupKey -> subKey, summing amt per month.
// extraKeys captures representative field values on the sub rows (e.g. holder, company).
export function buildPivot(
  rows: Transaction[],
  groupKey: keyof Transaction,
  subKey: keyof Transaction,
  extraKeys: (keyof Transaction)[] = []
): PivotGroup[] {
  const groups = new Map<string, PivotGroup & { subMap: Map<string, PivotSub> }>();
  for (const r of rows) {
    const gk = String(r[groupKey] ?? "");
    let g = groups.get(gk);
    if (!g) {
      g = { key: gk, mon: {}, tot: 0, n: 0, subs: [], subMap: new Map() };
      groups.set(gk, g);
    }
    g.mon[r.month] = (g.mon[r.month] || 0) + r.amt;
    g.tot += r.amt;
    g.n += 1;
    const sk = String(r[subKey] ?? "");
    let s = g.subMap.get(sk);
    if (!s) {
      const extra: Record<string, string> = {};
      for (const ek of extraKeys) extra[ek as string] = String(r[ek] ?? "");
      s = { key: sk, mon: {}, tot: 0, n: 0, extra };
      g.subMap.set(sk, s);
    }
    s.mon[r.month] = (s.mon[r.month] || 0) + r.amt;
    s.tot += r.amt;
    s.n += 1;
  }
  const out = Array.from(groups.values());
  for (const g of out) {
    g.subs = Array.from(g.subMap.values()).sort((a, b) => b.tot - a.tot);
  }
  out.sort((a, b) => b.tot - a.tot);
  return out;
}

export function monthTotals(rows: Transaction[], months: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const mo of months) m[mo] = 0;
  for (const r of rows) m[r.month] = (m[r.month] || 0) + r.amt;
  return m;
}
