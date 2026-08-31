import { apiRoute, OPTIONS } from "@/lib/api/handler";
import { byMonth, totalsOf } from "@/lib/api/report";

export const dynamic = "force-dynamic";

export const GET = apiRoute((rows) => ({ totals: totalsOf(rows), by_month: byMonth(rows) }));

export { OPTIONS };
