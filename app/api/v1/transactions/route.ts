import { authenticate } from "@/lib/api/auth";
import { metaBlock, OPTIONS } from "@/lib/api/handler";
import { apiJson, corsHeaders, handle } from "@/lib/api/http";
import { fetchPage, parseFilters, parsePaging } from "@/lib/api/query";
import { round2 } from "@/lib/api/report";
import type { Transaction } from "@/lib/types";

export const dynamic = "force-dynamic";

const CSV_COLS: (keyof Transaction)[] = [
  "id", "date", "month", "company", "card", "holder", "merchant", "cat",
  "amt", "status", "department", "tech_group", "tech_supplier", "srv_group", "manual",
];

function toCsv(rows: Transaction[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [CSV_COLS.join(",")];
  for (const r of rows) lines.push(CSV_COLS.map((c) => esc(r[c])).join(","));
  return "﻿" + lines.join("\n"); // BOM so Excel reads the Hebrew correctly
}

export const GET = (req: Request) =>
  handle(req, async () => {
    const scope = await authenticate(req);
    const url = new URL(req.url);
    const filters = parseFilters(url);
    const paging = parsePaging(url);
    const { rows, total } = await fetchPage(filters, scope, paging);
    const data = rows.map((r) => ({ ...r, amt: round2(r.amt) }));

    if (url.searchParams.get("format") === "csv")
      return new Response(toCsv(data), {
        headers: {
          ...corsHeaders(req.headers.get("origin")),
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="reap_transactions.csv"',
        },
      });

    return apiJson(req, {
      meta: metaBlock(scope, filters),
      pagination: {
        total,
        limit: paging.limit,
        offset: paging.offset,
        returned: data.length,
        has_more: paging.offset + data.length < total,
        next_offset: paging.offset + data.length < total ? paging.offset + data.length : null,
      },
      sort: { field: paging.sort, order: paging.order },
      data,
    });
  });

export { OPTIONS };
