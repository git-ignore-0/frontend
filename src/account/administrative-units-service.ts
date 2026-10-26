import type {Locale} from "@/types";
import {accountApi,AccountApiError} from "./account-api.ts";

export type AdministrativeUnit={code:string;name:string};

function unitsFrom(value:unknown):AdministrativeUnit[]{
  if(!Array.isArray(value))throw new AccountApiError("invalid_response",502);
  return value.map(entry=>{
    if(!entry||typeof entry!=="object"||Array.isArray(entry))throw new AccountApiError("invalid_response",502);
    const item=entry as Record<string,unknown>;
    if(typeof item.code!=="string"||!item.code||typeof item.name!=="string"||!item.name.trim())throw new AccountApiError("invalid_response",502);
    return {code:item.code,name:item.name.trim()};
  });
}

export async function getAdministrativeProvinces(locale:Locale):Promise<AdministrativeUnit[]>{
  const payload=await accountApi("administrative-provinces",{headers:{"Accept-Language":locale}});
  return unitsFrom(payload.data);
}

export async function getAdministrativeWards(provinceCode:string,locale:Locale):Promise<AdministrativeUnit[]>{
  const payload=await accountApi(`administrative-wards?province=${encodeURIComponent(provinceCode)}`,{headers:{"Accept-Language":locale}});
  return unitsFrom(payload.data);
}
