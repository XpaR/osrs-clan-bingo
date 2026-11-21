import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, cookieSecure, sessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", sessionCookie(cookieSecure(request), 0));
  return NextResponse.json({ ok: true });
}
