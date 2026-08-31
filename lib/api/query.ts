import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiScope } from "./auth";
import { badRequest } from "./http";
import { serviceClient } from "./service";
import type { Transaction } from "@/lib/types";

const COLUMNS =
  "id,date,month,ts,tid,company,card,holder,merchant,cat,amt,status,srv_group,tech_supplier,tech_group,department,manual";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

export type Filters = {
  from?: string;
  to?: string;
  months: string[];
  companies: string[];
  cards: string[];
  merchants: string[];
  categories: string[];
  departments: string[];
  techGroups: string[];
  srvGroups: string[];
  search?: string;
  manual?: boolean;
  minAmount?: number;
  maxAmount?: number;
};

// Repeatable or comma-separated: ?company=Rain&company=Hodlr or ?company=Rain,Hodlr
function list(sp: URLSearchParams, ...names: string[]): string[] {
  const out: string[] = [];
  for (const name of names)
    for (const raw of sp.getAll(name))
      for (const v of raw.split(",")) if (v.trim()) out.push(v.trim());
  return out;
}

function num(sp: URLSearchParams, name: string): number | undefined {
  const raw = sp.get(name);
  if (raw === null || raw === "") return undefined;
  const n = Number(raw);
  if (!isFinite(n)) badRequest(`הפרמטר ${name} חייב להיות מספר`);
  return n;
}

function bool(sp: URLSearchParams, name: string): boolean | undefined {
  const raw = sp.get(name);
  if (raw === null || raw === "") return undefined;
  if (["true", "1", "yes"].includes(raw.toLowerCase())) return true;
  if (["false", "0", "no"].includes(raw.toLowerCase())) return false;
  badRequest(`הפרמטר ${name} חייב להיות true או false`);
}

export function parseFilters(url: URL): Filters {
  const sp = url.searchParams;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;
  if (from && !DATE_RE.test(from)) badRequest("from חייב להיות בפורמט YYYY-MM-DD");
  if (to && !DATE_RE.test(to)) badRequest("to חייב להיות בפורמט YYYY-MM-DD");
  const months = list(sp, "month", "months");
  for (const m of months) if (!MONTH_RE.test(m)) badRequest(`month חייב להיות בפורמט YYYY-MM (התקבל: ${m})`);

  return {
    from,
    to,
    months,
    companies: list(sp, "company", "companies"),
    cards: list(sp, "card", "cards"),
    merchants: list(sp, "merchant", "supplier"),
    categories: list(sp, "category", "cat"),
    departments: list(sp, "department", "departments"),
    techGroups: list(sp, "tech_group"),
    srvGroups: list(sp, "srv_group"),
    search: sp.get("q")?.trim() || undefined,
    manual: bool(sp, "manual"),
    minAmount: num(sp, "min_amount"),
    maxAmount: num(sp, "max_amount"),
  };
}

// PostgREST needs each value quoted inside a not.in(...) list.
function quoteList(values: string[]): string {
  return `(${values.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")})`;
}

// Query type is derived from the client so we don't depend on @supabase/postgrest-js internals.
function baseQuery(client: SupabaseClient, withCount = false) {
  return withCount
    ? client.from("transactions").select(COLUMNS, { count: "exact" })
    : client.from("transactions").select(COLUMNS);
}
type Query = ReturnType<typeof baseQuery>;

// Intersects the caller's ?company= filter with what the key is allowed to see.
// Returns null when the key may not see anything (=> empty result, not an error).
function allowedCompanies(f: Filters, scope: ApiScope): string[] | null {
  if (scope.all_companies) return f.companies.length ? f.companies : [];
  if (!scope.companies.length) return null;
  if (!f.companies.length) return scope.companies;
  const allowed = f.companies.filter((c) => scope.companies.includes(c));
  return allowed.length ? allowed : null;
}

function apply(q: Query, f: Filters, companies: string[], scope: ApiScope): Query {
  if (companies.length) q = q.in("company", companies);
  if (scope.denied_cards.length) q = q.not("card", "in", quoteList(scope.denied_cards));
  if (f.from) q = q.gte("date", f.from);
  if (f.to) q = q.lte("date", f.to);
  if (f.months.length) q = q.in("month", f.months);
  if (f.cards.length) q = q.in("card", f.cards);
  if (f.merchants.length) q = q.in("merchant", f.merchants);
  if (f.categories.length) q = q.in("cat", f.categories);
  if (f.departments.length) q = q.in("department", f.departments);
  if (f.techGroups.length) q = q.in("tech_group", f.techGroups);
  if (f.srvGroups.length) q = q.in("srv_group", f.srvGroups);
  if (f.manual !== undefined) q = q.eq("manual", f.manual);
  if (f.minAmount !== undefined) q = q.gte("amt", f.minAmount);
  if (f.maxAmount !== undefined) q = q.lte("amt", f.maxAmount);
  if (f.search) q = q.ilike("merchant", `%${f.search}%`);
  return q;
}

export type ExtraFilter = (q: Query) => Query;

// Every scoped row matching the filters (paginated around PostgREST's 1000-row cap).
// Used by the aggregation endpoints, which sum in JS exactly like the dashboard does.
export async function fetchRows(
  f: Filters,
  scope: ApiScope,
  extra?: ExtraFilter
): Promise<Transaction[]> {
  const companies = allowedCompanies(f, scope);
  if (companies === null) return [];
  const client = serviceClient();
  const PAGE = 1000;
  const out: Transaction[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = apply(baseQuery(client), f, companies, scope);
    if (extra) q = extra(q);
    const { data, error } = await q.order("date", { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    for (const r of data) out.push({ ...(r as Transaction), amt: Number(r.amt) });
    if (data.length < PAGE) break;
  }
  return out;
}

const SORTABLE = ["date", "amt", "month", "company", "card", "merchant"] as const;

export async function fetchPage(
  f: Filters,
  scope: ApiScope,
  opts: { limit: number; offset: number; sort: string; order: "asc" | "desc" }
): Promise<{ rows: Transaction[]; total: number }> {
  if (!SORTABLE.includes(opts.sort as (typeof SORTABLE)[number]))
    badRequest(`sort חייב להיות אחד מ: ${SORTABLE.join(", ")}`);
  const companies = allowedCompanies(f, scope);
  if (companies === null) return { rows: [], total: 0 };

  const client = serviceClient();
  const q = apply(baseQuery(client, true), f, companies, scope);
  const { data, error, count } = await q
    .order(opts.sort, { ascending: opts.order === "asc" })
    .order("id", { ascending: true })
    .range(opts.offset, opts.offset + opts.limit - 1);
  if (error) throw new Error(error.message);
  return {
    rows: (data ?? []).map((r) => ({ ...(r as Transaction), amt: Number(r.amt) })),
    total: count ?? 0,
  };
}

export function parsePaging(url: URL): { limit: number; offset: number; sort: string; order: "asc" | "desc" } {
  const sp = url.searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit") ?? 500) || 500, 1), 5000);
  const offset = Math.max(Number(sp.get("offset") ?? 0) || 0, 0);
  const order = (sp.get("order") ?? "desc").toLowerCase();
  if (order !== "asc" && order !== "desc") badRequest("order חייב להיות asc או desc");
  return { limit, offset, sort: sp.get("sort") ?? "date", order };
}

// Echoed back on every response so a consumer can see exactly what was applied.
export function describeFilters(f: Filters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}
