import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { readProofFile } from "@/lib/proofs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const file = readProofFile(getDb(), id);
  if (!file) return NextResponse.json({ error: "Screenshot not found." }, { status: 404 });
  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
