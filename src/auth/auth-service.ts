import type {Session} from "@/types";

/** the site's canonical GET /api/auth/session response: {data:{user:CoreUser|null}}. */
type SessionUser = {sub:string;name:string;email:string;phone_number:string;date_of_birth:string|null};
type SessionResponse = {data:{user:SessionUser|null}};

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
export async function getSession():Promise<Session|null> {
  const response=await fetch("/api/auth/session",{method:"GET",credentials:"same-origin",cache:"no-store"});
  if(!response.ok)throw statusError(response.status);
  const payload:unknown=await response.json();
  if(!payload || typeof payload!=="object" || !("data" in payload))throw new Error("Phản hồi phiên từ hệ thống xác thực không hợp lệ.");
  const data=(payload as Partial<SessionResponse>).data;
  if(!data || !("user" in data))throw new Error("Phản hồi phiên từ hệ thống xác thực không hợp lệ.");
  if(data.user===null)return null;
  const user=data.user;
  if(!user || typeof user.sub!=="string" || typeof user.name!=="string" || typeof user.email!=="string" ||
    typeof user.phone_number!=="string" || !(user.date_of_birth===null||typeof user.date_of_birth==="string")) {
    throw new Error("Dữ liệu người dùng từ hệ thống xác thực không hợp lệ.");
  }
  return {authenticated:true,profile:{
    name:user.name,
    phone:user.phone_number,
    email:user.email,
    dateOfBirth:user.date_of_birth,
  }};
}
