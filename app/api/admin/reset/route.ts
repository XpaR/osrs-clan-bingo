import { getDb } from "@/lib/db";
import { fail, publicJson, readBody, requireAdmin } from "@/lib/http";
import { resetProgress, resetToSeed } from "@/lib/mutations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await readBody(request);
    if (body.mode === "seed") resetToSeed(getDb());
    else if (body.mode === "progress") resetProgress(getDb());
    else throw new Error("Choose progress or seed.");
    return publicJson();
  } catch (error) {
    return fail(error);
  }
}
