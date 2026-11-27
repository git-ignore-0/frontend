import type {Session} from "@/types";
import {parseCoreUser} from "./core-user.ts";
import {browserSessionEpoch,GUEST_SESSION_BINDING,verifyPageSession} from "./public-session-context.ts";

export function isUnauthorized(error:unknown):boolean {
  if(!error || typeof error!=="object")return false;
  const value=error as {status?:unknown;code?:unknown;response?:{status?:unknown}};
  return value.status===401 || value.code===401 || value.code==="UNAUTHORIZED" || value.response?.status===401;
}

function statusError(status:number):Error & {status:number} {
  return Object.assign(new Error(status===401?"Phiên đăng nhập đã hết hạn.":`Không thể kiểm tra phiên đăng nhập (HTTP ${status}).`),{status});
}

/**
 * The session route must be reverse-proxied to the website under the same origin as the app.
 * Never decode the sealed session cookie or treat unreachable session APIs as guests.
 */
export async function getSession(isCurrent:()=>boolean=()=>true):Promise<Session|null> {
  const epoch=browserSessionEpoch();
  const response=await fetch("/api/auth/session",{method:"GET",credentials:"same-origin",cache:"no-store"});
  if(!response.ok)throw statusError(response.status);
  const payload:unknown=await response.json();
  if(!payload || typeof payload!=="object" || !("data" in payload))throw new Error("Phản hồi phiên từ hệ thống xác thực không hợp lệ.");
  const data=payload.data;
  if(!data || typeof data!=="object" || !("user" in data) || !("binding" in data) || typeof data.binding!=="string" || !data.binding ||
    (data.user===null)!==(data.binding===GUEST_SESSION_BINDING))throw new Error("Phản hồi phiên từ hệ thống xác thực không hợp lệ.");
  const user=data.user===null?null:parseCoreUser(data.user);
  if(data.user!==null&&!user) {
    throw new Error("Dữ liệu người dùng từ hệ thống xác thực không hợp lệ.");
  }
  if(!isCurrent())throw new DOMException("Session check replaced","AbortError");
  if(!verifyPageSession(data.binding,epoch))throw Object.assign(statusError(409),{code:"session_changed"});
  if(!user)return null;
  return {authenticated:true,subject:user.sub,binding:data.binding,profile:{
    name:user.name,
    phone:user.phone_number,
    email:user.email,
    dateOfBirth:user.date_of_birth,
  }};
}
