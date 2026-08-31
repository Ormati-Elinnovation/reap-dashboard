import { NextResponse } from "next/server";

// Allowed browser origins. Default "*" — keys are meant to be used server-to-server;
// set API_ALLOWED_ORIGINS to a comma-separated list to lock the API to known apps.
const ORIGINS = (process.env.API_ALLOWED_ORIGINS ?? "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowAll = ORIGINS.includes("*");
  const allowed = allowAll ? "*" : origin && ORIGINS.includes(origin) ? origin : "";
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, x-api-key, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
  };
  if (allowed) h["Access-Control-Allow-Origin"] = allowed;
  if (!allowAll) h["Vary"] = "Origin";
  return h;
}

// Public origin of the current request (Vercel terminates TLS upstream, so trust the proxy headers).
export function requestOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

export function apiJson(req: Request, body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: corsHeaders(req.headers.get("origin")) });
}

export function apiError(req: Request, status: number, code: string, message: string): NextResponse {
  const res = apiJson(req, { error: { code, message } }, status);
  if (status === 401) res.headers.set("WWW-Authenticate", 'Bearer realm="reap-api"');
  return res;
}

export function preflight(req: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

// Route handlers wrap their body in this so an unexpected throw never leaks a stack trace.
export async function handle(req: Request, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiFailure) return apiError(req, e.status, e.code, e.message);
    console.error("[api]", e);
    return apiError(req, 500, "internal_error", "אירעה שגיאה בשרת");
  }
}

export class ApiFailure extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function badRequest(message: string): never {
  throw new ApiFailure(400, "bad_request", message);
}
