import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { resolveStatement } from "@/lib/statements";

export const dynamic = "force-dynamic";

// Serves statement files (PDF/CSV) to logged-in users only.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rel = (await params).path.map(decodeURIComponent).join("/");
  const full = resolveStatement(rel);
  if (!full) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ext = path.extname(full).toLowerCase();
  const body = readFileSync(full);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": ext === ".pdf" ? "application/pdf" : "text/csv; charset=utf-8",
      "Content-Disposition": `inline; filename="${path.basename(full)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
