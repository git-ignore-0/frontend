import type {Locale} from "@/types";
import {accountApi,AccountApiError} from "./account-api.ts";

export type AdministrativeUnit={code:string;name:string};
const pending=new Map<string,Promise<AdministrativeUnit[]>>();

function unitsFrom(value:unknown):AdministrativeUnit[]{
  if(!Array.isArray(value))throw new AccountApiError("invalid_response",502);
  return value.map(entry=>{
    if(!entry||typeof entry!=="object"||Array.isArray(entry))throw new AccountApiError("invalid_response",502);
    const item=entry as Record<string,unknown>;
    if(typeof item.code!=="string"||!item.code||typeof item.name!=="string"||!item.name.trim())throw new AccountApiError("invalid_response",502);
    return {code:item.code,name:item.name.trim()};
  });
}

function getUnits(path:string,locale:Locale):Promise<AdministrativeUnit[]>{
  const key=`${locale}:${path}`;
  const current=pending.get(key);
  if(current)return current;
  const request=accountApi(path,{headers:{"Accept-Language":locale}})
    .then(payload=>unitsFrom(payload.data)).finally(()=>{pending.delete(key)});
  pending.set(key,request);
  return request;
}

export function getAdministrativeProvinces(locale:Locale):Promise<AdministrativeUnit[]>{
  return getUnits("administrative-provinces",locale);
}

export function getAdministrativeWards(provinceCode:string,locale:Locale):Promise<AdministrativeUnit[]>{
  return getUnits(`administrative-wards?province=${encodeURIComponent(provinceCode)}`,locale);
}

export async function resolveAdministrativeAddressNames(provinceCode:string,wardCode:string,locale:Locale):Promise<{provinceName:string;wardName:string}>{
  const [provinces,wards]=await Promise.all([
    getAdministrativeProvinces(locale),
    getAdministrativeWards(provinceCode,locale),
  ]);
  return {
    provinceName:provinces.find(item=>item.code===provinceCode)?.name??provinceCode,
    wardName:wards.find(item=>item.code===wardCode)?.name??wardCode,
  };
}
