import { authenticate, type ApiScope } from "./auth";
import { apiJson, handle, preflight } from "./http";
import { describeFilters, fetchRows, parseFilters, type Filters } from "./query";
import { breakdown, byMonth, monthsMeta, totalsOf } from "./report";
import type { Transaction } from "@/lib/types";

export const OPTIONS = (req: Request) => preflight(req);

export function metaBlock(scope: ApiScope, f: Filters) {
  return {
    generated_at: new Date().toISOString(),
    key: scope.name,
    currency: "USD",
    filters: describeFilters(f),
  };
}

// Every data route follows the same shape: authenticate -> parse filters -> fetch the
// scoped rows -> aggregate. `route` receives the rows and returns the response body.
export function apiRoute(
  build: (rows: Transaction[], ctx: { scope: ApiScope; filters: Filters; url: URL }) => unknown,
  requireField?: keyof Transaction
) {
  return async (req: Request): Promise<Response> =>
    handle(req, async () => {
      const scope = await authenticate(req);
      const url = new URL(req.url);
      const filters = parseFilters(url);
      const rows = await fetchRows(
        filters,
        scope,
        requireField ? (q) => q.not(requireField as string, "is", null) : undefined
      );
      return apiJson(req, {
        meta: metaBlock(scope, filters),
        ...(build(rows, { scope, filters, url }) as object),
      });
    });
}

// Grouped report: totals + month columns + a two-level breakdown, matching the pivots in the UI.
export function reportRoute(opts: {
  group: keyof Transaction;
  sub?: keyof Transaction;
  extras?: (keyof Transaction)[];
  require?: keyof Transaction;
}) {
  return apiRoute(
    (rows) => ({
      totals: totalsOf(rows),
      months: monthsMeta(rows),
      by_month: byMonth(rows),
      groups: breakdown(rows, opts.group, opts.sub ?? null, opts.extras ?? []),
    }),
    opts.require
  );
}
