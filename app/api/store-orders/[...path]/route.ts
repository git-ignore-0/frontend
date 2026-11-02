import {NextRequest,NextResponse} from "next/server";
import {storeLookupIdentityHeaders} from "@/store/store-proxy-identity";
import {storeOrderQueryAllowed,storeOrderTarget} from "@/store/order-bff";
import {authOrigin,publicSiteOrigin} from "@/auth/server/config";
import {AuthServiceUnavailableError,currentPublicSession,sessionTokensChanged} from "@/auth/server/oauth";
import {clearSession,readSession,writeSession} from "@/auth/server/session";
import {readGuestOrders,STORE_GUEST_COOKIE,STORE_LOOKUP_COOKIE,guestOrderCookieName,guestOrderCookiePath,readGuestOrderToken,writeGuestOrderToken} from "@/store/store-order-session";

export const runtime="nodejs";export const dynamic="force-dynamic";
const privateHeaders={"Cache-Control":"private, no-store",Pragma:"no-cache"};
function error(code:string,status:number){return NextResponse.json({error:code},{status,headers:privateHeaders})}
function cookieValue(request:NextRequest,name:string){const value=request.cookies.get(name)?.value;return value&&value.length<=4096?value:""}
function setCookies(headers:Headers){const getter=(headers as Headers&{getSetCookie?:()=>string[]}).getSetCookie;return typeof getter==="function"?getter.call(headers):(headers.get("set-cookie")?[headers.get("set-cookie") as string]:[])}
function rewriteLookupCookie(value:string){if(!value.trimStart().startsWith(`${STORE_LOOKUP_COOKIE}=`))return null;return /;\s*path=/i.test(value)?value.replace(/(;\s*path=)[^;]*/i,"$1/api/store-orders/lookup"):value+"; Path=/api/store-orders/lookup"}
async function handler(request:NextRequest,context:{params:Promise<{path:string[]}>}){
 const {path}=await context.params,method=request.method==="POST"?"POST":"GET",target=storeOrderTarget(path,method);
 if(!target)return error("not_found",404);
 const requestUrl=new URL(request.url);if(!storeOrderQueryAllowed(requestUrl,target.query))return error("not_found",404);
 if(method==="POST"&&(request.headers.get("origin")!==publicSiteOrigin()||request.headers.get("x-nfv-public-request")!=="1"))return error("invalid_origin",403);
 const orderId=path[0]==="orders"?path[1]:null,guestOrders=readGuestOrders(cookieValue(request,STORE_GUEST_COOKIE)),guestToken=orderId?(readGuestOrderToken(cookieValue(request,guestOrderCookieName(orderId)),orderId)||guestOrders.orders[orderId]||""):"";
 // A matching sealed guest-order token is the authority for that order, even
 // when an unrelated (or expired) OAuth session cookie is also present.
 const useGuestAuthority=target.guestOrder&&!!orderId&&!!guestToken;
 let session=null;
 if(target.session!=="none"&&!useGuestAuthority){
  const stored=await readSession();
  if(!stored&&target.session==="required")return error("unauthorized",401);
  if(stored)try{session=await currentPublicSession(stored);if(sessionTokensChanged(stored,session))await writeSession(session)}catch(reason){if(reason instanceof AuthServiceUnavailableError){if(reason.rotatedSession)await writeSession(reason.rotatedSession);return error("upstream_unavailable",502)}await clearSession();return error("session_expired",401)}
 }
 let body:BodyInit|undefined;
 if(method==="POST"){
  const parsed=await request.json().catch(()=>null);if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return error("invalid_request",400);
  const sanitized={...(parsed as Record<string,unknown>)};
  if(target.guestOrder)delete sanitized.access_token;
  body=JSON.stringify(useGuestAuthority?{...sanitized,access_token:guestToken}:sanitized);
 }
 const clientIdentity=target.lookupCookie&&method==="POST"?storeLookupIdentityHeaders(request.headers):{};
 if(clientIdentity===null)return error("upstream_unavailable",503);
 const headers:Record<string,string>={...clientIdentity,Accept:"application/json",...(session?{Authorization:`Bearer ${session.accessToken}`}:{})};
 if(method==="POST")headers["Content-Type"]="application/json";
 if(useGuestAuthority&&method==="GET")headers["X-Store-Access-Token"]=guestToken;
 const lookup=cookieValue(request,STORE_LOOKUP_COOKIE);if(target.lookupCookie&&lookup)headers.Cookie=`${STORE_LOOKUP_COOKIE}=${lookup}`;
 let upstream:Response;try{const url=new URL(target.path,authOrigin());url.search=requestUrl.search;upstream=await fetch(url,{method,headers,body,cache:"no-store",signal:AbortSignal.timeout(10_000)})}catch(reason){const timeout=reason instanceof DOMException&&["AbortError","TimeoutError"].includes(reason.name);return error(timeout?"upstream_timeout":"upstream_unavailable",timeout?504:502)}
 if(session&&upstream.status===401)await clearSession();
 const responseHeaders=new Headers(privateHeaders);responseHeaders.set("Content-Type",upstream.headers.get("content-type")||"application/json");
 if(target.lookupCookie)for(const value of setCookies(upstream.headers)){const rewritten=rewriteLookupCookie(value);if(rewritten)responseHeaders.append("Set-Cookie",rewritten)}
 if(path[0]==="checkout"&&upstream.ok&&!session){
  const payload=await upstream.json().catch(()=>null) as {data?:Record<string,unknown>}|null,token=payload?.data?.guest_access_token,id=payload?.data?.id;
  if(typeof token!=="string"||typeof id!=="string")return error("invalid_response",502);
  delete payload?.data?.guest_access_token;
  const response=NextResponse.json(payload,{status:upstream.status,headers:responseHeaders});response.cookies.set(guestOrderCookieName(id),writeGuestOrderToken(id,token),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:guestOrderCookiePath(id),maxAge:60*60*24*7});return response;
 }
 return new NextResponse(upstream.body,{status:upstream.status,headers:responseHeaders});
}
export const GET=handler;export const POST=handler;
