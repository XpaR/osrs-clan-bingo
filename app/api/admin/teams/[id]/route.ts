import { getDb } from "@/lib/db";
import { fail, publicJson, readBody, requireAdmin } from "@/lib/http";
import { deleteTeam, updateTeam } from "@/lib/mutations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const body = await readBody(request);
    updateTeam(getDb(), id, body);
    return publicJson();
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await context.params;
    deleteTeam(getDb(), id);
    return publicJson();
  } catch (error) {
    return fail(error);
  }
}
