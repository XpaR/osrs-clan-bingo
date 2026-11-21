import { NextResponse } from "next/server";
import { isAdminRequest, usingDefaultPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const admin = await isAdminRequest();
  return NextResponse.json({
    admin,
    usingDefaultPassword: admin ? usingDefaultPassword() : false,
  });
}
