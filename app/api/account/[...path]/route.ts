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
const trackerCookieName="nfv_csa_tracker";
const trackerBffPath="/api/account/csa-contract-tracker";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: privateHeaders });
}

function trackerCookieHeader(request:Request){
  const entry=request.headers.get("cookie")?.split(";").map(value=>value.trim()).find(value=>value.startsWith(`${trackerCookieName}=`));
  if(!entry)return null;
  const value=entry.slice(trackerCookieName.length+1);
  if(!value||value.length>128||/[;\r\n]/.test(value))return null;
  return `${trackerCookieName}=${value}`;
}

function responseSetCookies(headers:Headers){
  const getter=(headers as Headers&{getSetCookie?:()=>string[]}).getSetCookie;
  if(typeof getter==="function")return getter.call(headers);
  const combined=headers.get("set-cookie");
  return combined?combined.split(/,(?=\s*[!#$%&'*+.^_`|~0-9A-Za-z-]+=)/):[];
}

function rewriteTrackerSetCookie(value:string){
  if(!value.trimStart().startsWith(`${trackerCookieName}=`))return null;
  return /;\s*path=/i.test(value)?value.replace(/(;\s*path=)[^;]*/i,`$1${trackerBffPath}`):`${value}; Path=${trackerBffPath}`;
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const method = request.method === "POST" || request.method === "PUT" ? request.method : "GET";
  const upstream = accountUpstreamTarget(path, method);
  if (!upstream) return jsonError("not_found", 404);

  const requestUrl = new URL(request.url);
  if (!accountQueryAllowed(requestUrl, upstream.query)) return jsonError(upstream.query==="tracker-pdf"?"invalid_contract_locale":"not_found", upstream.query==="tracker-pdf"?400:404);
  if (
    method !== "GET" &&
    (request.headers.get("origin") !== publicSiteOrigin() ||
      request.headers.get("x-nfv-public-request") !== "1")
  ) {
    return jsonError("invalid_origin", 403);
  }

  let session = null;
  if (upstream.session !== "none") {
    const stored = await readSession();
    if(!stored){
      if(upstream.session==="required")return jsonError("unauthorized",401);
    }else{
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
        ...(method !== "GET" ? { "Content-Type": "application/json" } : {}),
        ...(upstream.trackerCookie&&trackerCookieHeader(request)?{Cookie:trackerCookieHeader(request) as string}:{}),
      },
      body: method !== "GET" ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    const timedOut =
      error instanceof DOMException && ["AbortError", "TimeoutError"].includes(error.name);
    return jsonError(timedOut ? "upstream_timeout" : "upstream_unavailable", timedOut ? 504 : 502);
  }

  if (session && response.status === 401) await clearSession();
  const responseHeaders=new Headers({
    "Content-Type":response.headers.get("content-type")||"application/json",
    "Cache-Control":"private, no-store",
    Pragma:"no-cache",
  });
  for(const name of ["content-disposition","x-content-type-options"]){
    const value=response.headers.get(name);if(value)responseHeaders.set(name,value);
  }
  if(upstream.trackerCookie){
    for(const value of responseSetCookies(response.headers)){
      const rewritten=rewriteTrackerSetCookie(value);if(rewritten)responseHeaders.append("Set-Cookie",rewritten);
    }
  }
  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
