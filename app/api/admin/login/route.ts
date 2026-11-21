import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  clearFailures,
  clientKey,
  cookieSecure,
  createSessionToken,
  passwordsMatch,
  registerFailure,
  sessionCookie,
  tooManyFailures,
} from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const key = clientKey(request);
  if (tooManyFailures(key)) {
    return NextResponse.json({ error: "Too many tries. Wait a few minutes and try again." }, { status: 429 });
  }
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  if (!passwordsMatch(password)) {
    registerFailure(key);
    return NextResponse.json({ error: "That password does not match." }, { status: 401 });
  }
  clearFailures(key);
  const jar = await cookies();
  jar.set(COOKIE_NAME, createSessionToken(), sessionCookie(cookieSecure(request)));
  return NextResponse.json({ ok: true });
}
