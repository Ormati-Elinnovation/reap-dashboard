import { apiRoute, OPTIONS } from "@/lib/api/handler";
import { breakdown, byMonth, largest, monthsMeta, totalsOf } from "@/lib/api/report";

export const dynamic = "force-dynamic";

export const GET = apiRoute((rows, { url }) => {
  const top = Number(url.searchParams.get("top") ?? 10) || 10;
  return {
    totals: totalsOf(rows),
    months: monthsMeta(rows),
    by_month: byMonth(rows),
    largest_transaction: largest(rows),
    top_suppliers: breakdown(rows, "merchant", null).slice(0, top),
    by_company: breakdown(rows, "company", null),
  };
});

export { OPTIONS };
