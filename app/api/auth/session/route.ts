import { NextResponse } from "next/server";
import {
  AuthServiceUnavailableError,
  currentPublicSession,
  sessionTokensChanged,
} from "@/auth/server/oauth";
import { clearSession, readSession, writeSession } from "@/auth/server/session";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers });
}

export async function GET() {
  const session = await readSession();
  if (!session) return NextResponse.json({ data: { user: null } }, { headers });
  try {
    const current = await currentPublicSession(session);
    if (sessionTokensChanged(session, current)) await writeSession(current);
    return NextResponse.json({ data: { user: current.user } }, { headers });
  } catch (error) {
    if (error instanceof AuthServiceUnavailableError) {
      if (error.rotatedSession) await writeSession(error.rotatedSession);
      return jsonError("upstream_unavailable", 502);
    }
    await clearSession();
    return jsonError("session_expired", 401);
  }
}
