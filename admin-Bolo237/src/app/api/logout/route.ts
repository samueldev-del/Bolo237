import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { clearBackendAdminSession } from "@/lib/backend-admin";

export async function POST() {
  clearBackendAdminSession();
  await destroySession();
  return NextResponse.json({ ok: true });
}
