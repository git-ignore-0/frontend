import {accountUpstreamTarget} from "./bff-path.ts";
import {capturePageSession,GUEST_SESSION_BINDING,isPageSessionCurrent,PUBLIC_SESSION_HEADER,retirePageSession} from "../auth/public-session-context.ts";

type JsonRecord = Record<string, unknown>;
const isRecord=(value:unknown):value is JsonRecord=>!!value&&typeof value==="object"&&!Array.isArray(value);

export class AccountApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly context?: JsonRecord;

  constructor(code: string, status: number, context?: JsonRecord) {
    super(code);
    this.name = "AccountApiError";
    this.code = code;
    this.status = status;
    this.context = context;
  }
}

export function isPublicAccessDenied(error: unknown): boolean {
  return error instanceof AccountApiError && error.status===403 &&
    !["invalid_origin","csrf_failed","csrf_rejected","csrf_token_invalid"].includes(error.code);
}

export async function publicResponse<T>(url: string, init: RequestInit | undefined, bound: boolean, read: (response:Response)=>Promise<T>): Promise<T> {
  const browserBound=bound&&typeof document!=="undefined";
  const expected=browserBound?capturePageSession():null;
  const requireCurrent=(status:number)=>{
    if(!browserBound)return;
    if(!expected)throw new AccountApiError("session_unverified",409);
    if(isPageSessionCurrent(expected))return;
    retirePageSession(expected);
    // A request already sent might have committed before the session changed.
    throw new AccountApiError("session_changed",status);
  };
  requireCurrent(409);
  const headers=new Headers(init?.headers);
  if(init?.body){
    headers.set("Content-Type","application/json");
    headers.set("X-NFV-Public-Request","1");
  }
  if(expected)headers.set(PUBLIC_SESSION_HEADER,expected.binding);
  else headers.delete(PUBLIC_SESSION_HEADER);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers,
    });
  } catch (error) {
    requireCurrent(0);
    if(init?.signal?.aborted)throw init.signal.reason;
    throw new AccountApiError(error instanceof DOMException&&error.name==="TimeoutError"?"request_timeout":"network_error", 0);
  }
  if(!response.ok){
    const payload:unknown=await response.json().catch(()=>null);
    const body=isRecord(payload)?payload:{};
    const errors = Array.isArray(body.errors) ? body.errors : [];
    const first=isRecord(errors[0])?errors[0]:{};
    const code = typeof first.code === "string"
      ? first.code
      : typeof body.error === "string"
        ? body.error
        : "request_failed";
    if(browserBound&&(code==="session_changed"||response.status===401&&expected?.binding!==GUEST_SESSION_BINDING))retirePageSession(expected);
    else requireCurrent(0);
    if(init?.signal?.aborted)throw init.signal.reason;
    throw new AccountApiError(code, response.status, isRecord(first.context)?first.context:undefined);
  }
  requireCurrent(0);
  try {
    const result=await read(response);
    requireCurrent(0);
    init?.signal?.throwIfAborted();
    return result;
  } catch(error) {
    requireCurrent(0);
    init?.signal?.throwIfAborted();
    throw error;
  }
}

export function publicJson(url:string,init:RequestInit|undefined,bound:boolean):Promise<JsonRecord>{
  return publicResponse(url,init,bound,async response=>{
    const payload:unknown=await response.json().catch(()=>null);
    if(!isRecord(payload))throw new AccountApiError("invalid_response",502);
    return payload;
  });
}

export function accountApi(path: string, init?: RequestInit): Promise<JsonRecord> {
  const method=init?.method==="POST"||init?.method==="PUT"?init.method:"GET";
  const target=accountUpstreamTarget(path.split("?",1)[0].split("/"),method);
  return publicJson(`/api/account/${path}`,init,!!target&&target.session!=="none");
}
