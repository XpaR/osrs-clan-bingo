import { getDb } from "@/lib/db";
import { fail, publicJson, readBody, requireAdmin } from "@/lib/http";
import { updateEvent } from "@/lib/mutations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await readBody(request);
    updateEvent(getDb(), {
      name: body.name,
      tagline: body.tagline,
      startAt: body.startAt,
      endAt: body.endAt,
      chatPassword: body.chatPassword,
      bonuses: (body.bonuses ?? {}) as { row?: unknown; column?: unknown; diagonal?: unknown; blackout?: unknown },
    });
    return publicJson();
  } catch (error) {
    return fail(error);
  }
}
