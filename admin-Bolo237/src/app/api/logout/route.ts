import { NextResponse } from "next/server";
import { clearStoredBackendSession, destroySession } from "@/lib/auth";
import { clearBackendAdminSession } from "@/lib/backend-admin";

export async function POST() {
  clearBackendAdminSession();
  await clearStoredBackendSession();
  await destroySession();
  return NextResponse.json({ ok: true });
}
