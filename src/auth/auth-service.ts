import type {Session} from "@/types";
import {parseCoreUser} from "./core-user.ts";

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
  const data=payload.data;
  if(!data || typeof data!=="object" || !("user" in data))throw new Error("Phản hồi phiên từ hệ thống xác thực không hợp lệ.");
  if(data.user===null)return null;
  const user=parseCoreUser(data.user);
  if(!user) {
    throw new Error("Dữ liệu người dùng từ hệ thống xác thực không hợp lệ.");
  }
  return {authenticated:true,subject:user.sub,profile:{
    name:user.name,
    phone:user.phone_number,
    email:user.email,
    dateOfBirth:user.date_of_birth,
  }};
}
