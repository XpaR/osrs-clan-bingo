import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE_NAME = "bingo_admin";
const SESSION_MS = 1000 * 60 * 60 * 24 * 7;

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "bingo-admin";
}

export function usingDefaultPassword() {
  return !process.env.ADMIN_PASSWORD;
}

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || "dev-only-session-secret-change-me";
}

export function passwordsMatch(input: string): boolean {
  const expected = adminPassword();
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    timingSafeEqual(Buffer.from(expected), Buffer.from(expected));
    return false;
  }
  return timingSafeEqual(left, right);
}

export function createSessionToken(now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ role: "admin", exp: now + SESSION_MS })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null, now = Date.now()): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { role?: string; exp?: number };
    return data.role === "admin" && typeof data.exp === "number" && data.exp > now;
  } catch {
    return false;
  }
}

export function cookieSecure(request?: Request): boolean {
  if (process.env.COOKIE_SECURE === "1") return true;
  if (process.env.COOKIE_SECURE === "0") return false;
  const forwarded = request?.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() === "https";
  return false;
}

export function sessionCookie(secure: boolean, maxAge = SESSION_MS / 1000) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge,
  };
}

export async function isAdminRequest(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(COOKIE_NAME)?.value);
}

const failures = new Map<string, { count: number; resetAt: number }>();

export function tooManyFailures(key: string, limit = 8): boolean {
  const row = failures.get(key);
  if (!row) return false;
  if (row.resetAt < Date.now()) {
    failures.delete(key);
    return false;
  }
  return row.count >= limit;
}

export function registerFailure(key: string, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const row = failures.get(key);
  if (!row || row.resetAt < now) {
    failures.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  row.count += 1;
}

export function clearFailures(key: string) {
  failures.delete(key);
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "local";
  return "local";
}
