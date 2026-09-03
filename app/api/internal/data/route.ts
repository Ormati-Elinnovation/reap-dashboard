import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/api/service";
import { fetchAllTransactions, fetchTechMap } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = serviceClient();
  const [tx, techMap] = await Promise.all([fetchAllTransactions(sb), fetchTechMap(sb)]);
  return NextResponse.json({ tx, techMap });
}
