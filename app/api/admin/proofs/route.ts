import { getDb } from "@/lib/db";
import { fail, publicJson, requireAdmin } from "@/lib/http";
import { addProofImages } from "@/lib/proofs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const form = await request.formData();
    const teamId = String(form.get("teamId") ?? "");
    const tileId = String(form.get("tileId") ?? "");
    const db = getDb();
    const completion = db
      .prepare("SELECT id FROM completions WHERE team_id = ? AND tile_id = ?")
      .get(teamId, tileId) as { id: string } | undefined;
    if (!completion) throw new Error("Mark the tile before uploading screenshots.");
    const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
    const buffers = await Promise.all(files.map(async (file) => Buffer.from(await file.arrayBuffer())));
    addProofImages(db, { completionId: completion.id, files: buffers });
    return publicJson();
  } catch (error) {
    return fail(error);
  }
}
