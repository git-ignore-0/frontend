import { NextRequest, NextResponse } from "next/server";

import { accountQueryAllowed, accountUpstreamTarget } from "@/account/bff-path";
import { authOrigin, publicSiteOrigin } from "@/auth/server/config";
import {
  AuthServiceUnavailableError,
  currentPublicSession,
  sessionTokensChanged,
} from "@/auth/server/oauth";
import { clearSession, readSession, writeSession } from "@/auth/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privateHeaders = { "Cache-Control": "private, no-store" };

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: privateHeaders });
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const method = request.method === "POST" ? "POST" : "GET";
  const upstream = accountUpstreamTarget(path, method);
  if (!upstream) return jsonError("not_found", 404);

  const requestUrl = new URL(request.url);
  if (!accountQueryAllowed(requestUrl, upstream.query)) return jsonError("not_found", 404);
  if (
    method === "POST" &&
    (request.headers.get("origin") !== publicSiteOrigin() ||
      request.headers.get("x-nfv-public-request") !== "1")
  ) {
    return jsonError("invalid_origin", 403);
  }

  let session = null;
  if (upstream.session === "required") {
    const stored = await readSession();
    if (!stored) return jsonError("unauthorized", 401);
    try {
      session = await currentPublicSession(stored);
      if (sessionTokensChanged(stored, session)) await writeSession(session);
    } catch (error) {
      if (error instanceof AuthServiceUnavailableError) {
        if (error.rotatedSession) await writeSession(error.rotatedSession);
        return jsonError("upstream_unavailable", 502);
      }
      await clearSession();
      return jsonError("session_expired", 401);
    }
  }

  const target = new URL(upstream.path, authOrigin());
  target.search = requestUrl.search;
  let response: Response;
  try {
    response = await fetch(target, {
      method,
      headers: {
        ...(session ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        ...(request.headers.get("accept-language")
          ? { "Accept-Language": request.headers.get("accept-language") as string }
          : {}),
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: method === "POST" ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && ["AbortError", "TimeoutError"].includes(error.name);
    return jsonError(timedOut ? "upstream_timeout" : "upstream_unavailable", timedOut ? 504 : 502);
  }

  if (session && response.status === 401) await clearSession();
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
      "Cache-Control": "private, no-store",
      Pragma: "no-cache",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
