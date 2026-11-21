import { NextResponse } from "next/server";
import { isAdminRequest } from "./auth";
import { getPublicState } from "./state";

export async function requireAdmin() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Admin login required." }, { status: 401 });
  }
  return null;
}

export function publicJson() {
  return NextResponse.json(getPublicState(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export function fail(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : "Request failed.";
  return NextResponse.json({ error: message }, { status });
}

export async function readBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new Error("Expected a JSON body.");
  }
}
