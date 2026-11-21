import { publicJson, fail } from "@/lib/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  try {
    return publicJson();
  } catch (error) {
    return fail(error, 500);
  }
}
