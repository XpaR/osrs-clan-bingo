import { getDb } from "@/lib/db";
import { fail, publicJson, requireAdmin } from "@/lib/http";
import { deleteProofImage } from "@/lib/proofs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const { id } = await context.params;
    deleteProofImage(getDb(), id);
    return publicJson();
  } catch (error) {
    return fail(error);
  }
}
