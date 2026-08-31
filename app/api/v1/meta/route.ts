import { apiRoute, OPTIONS } from "@/lib/api/handler";
import { monthsMeta } from "@/lib/api/report";

export const dynamic = "force-dynamic";

// The dimension values a consumer can filter on — build dropdowns from this.
export const GET = apiRoute((rows) => {
  const cards = new Map<string, { card: string; holder: string; company: string }>();
  for (const r of rows) if (!cards.has(r.card)) cards.set(r.card, { card: r.card, holder: r.holder, company: r.company });
  const uniq = (vals: (string | null | undefined)[]) =>
    [...new Set(vals.filter((v): v is string => !!v))].sort();
  const dates = rows.map((r) => r.date).sort();
  return {
    months: monthsMeta(rows),
    date_range: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    companies: uniq(rows.map((r) => r.company)),
    cards: [...cards.values()].sort((a, b) => a.card.localeCompare(b.card)),
    categories: uniq(rows.map((r) => r.cat)),
    departments: uniq(rows.map((r) => r.department)),
    tech_groups: uniq(rows.map((r) => r.tech_group)),
    server_groups: uniq(rows.map((r) => r.srv_group)),
    suppliers: uniq(rows.map((r) => r.merchant)),
  };
});

export { OPTIONS };
