import { getDb } from "@/lib/db";
import { fail, publicJson, readBody, requireAdmin } from "@/lib/http";
import { createTeam } from "@/lib/mutations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await readBody(request);
    createTeam(getDb(), body);
    return publicJson();
  } catch (error) {
    return fail(error);
  }
}
