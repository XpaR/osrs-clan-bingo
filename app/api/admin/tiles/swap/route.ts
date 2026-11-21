import { getDb } from "@/lib/db";
import { fail, publicJson, readBody, requireAdmin } from "@/lib/http";
import { swapTiles } from "@/lib/mutations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await readBody(request);
    swapTiles(getDb(), String(body.tileId ?? ""), String(body.withTileId ?? ""));
    return publicJson();
  } catch (error) {
    return fail(error);
  }
}
