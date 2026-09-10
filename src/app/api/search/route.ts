import { NextResponse, type NextRequest } from "next/server";
import { quickSearch } from "@/lib/catalog";
import { rateLimit } from "@/lib/rate-limit";
import { clientKey } from "@/lib/origin";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ items: [] });
  // Public endpoint: cap abuse without blocking legitimate shoppers.
  if (!(await rateLimit(`search:${await clientKey()}`, 40, 60_000))) {
    return NextResponse.json({ items: [] }, { status: 429 });
  }
  const items = await quickSearch(q, 6);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, max-age=30" } });
}
