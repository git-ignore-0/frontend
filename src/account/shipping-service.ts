import type {Address,Locale} from "../types.ts";
import {accountApi,AccountApiError} from "./account-api.ts";
import {getAdministrativeProvinces,getAdministrativeWards} from "./administrative-units-service.ts";
import type {ShippingAddressDraft,SupportedShippingProvince} from "./shipping-address-model.ts";

type JsonRecord=Record<string,unknown>;
type SavedAddressInput=ShippingAddressDraft&{provinceName:string;wardName:string};

function record(value:unknown):JsonRecord{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new AccountApiError("invalid_response",502);
  return value as JsonRecord;
}
function string(value:unknown):string{
  if(typeof value!=="string"||!value.trim())throw new AccountApiError("invalid_response",502);
  return value.trim();
}
function nullableFee(value:unknown):string|null{
  if(value===null)return null;
  const fee=string(value);
  if(!/^\d+$/.test(fee))throw new AccountApiError("invalid_response",502);
  return fee;
}

export async function getSupportedShippingAreas(locale:Locale,signal?:AbortSignal):Promise<SupportedShippingProvince[]>{
  const payload=await accountApi(`shipping-areas?locale=${locale}`,{signal});
  if(!Array.isArray(payload.data))throw new AccountApiError("invalid_response",502);
  return payload.data.map(value=>{
    const province=record(value);
    if(!Array.isArray(province.wards))throw new AccountApiError("invalid_response",502);
    return {
      code:string(province.province_code),
      name:string(province.province_name),
      wards:province.wards.map(value=>{const ward=record(value),shippingFeeVnd=nullableFee(ward.shipping_fee_vnd);if(shippingFeeVnd===null)throw new AccountApiError("invalid_response",502);return {code:string(ward.ward_code),name:string(ward.ward_name),shippingFeeVnd};}),
    };
  });
}

function addressFrom(value:unknown,names:{province:string;ward:string}):Address{
  const item=record(value),supported=item.is_supported;
  if(typeof supported!=="boolean")throw new AccountApiError("invalid_response",502);
  return {
    id:string(item.id),
    name:string(item.recipient_name),
    phone:string(item.phone_number),
    city:names.province,
    ward:names.ward,
    detail:string(item.address),
    provinceCode:string(item.province_code),
    wardCode:string(item.ward_code),
    isSupported:supported,
    shippingFeeVnd:nullableFee(item.shipping_fee_vnd),
    isDefault:true,
  };
}

export async function getShippingAddress(locale:Locale):Promise<Address|null>{
  const payload=await accountApi("shipping-address");
  if(payload.data===null)return null;
  const item=record(payload.data),provinceCode=string(item.province_code),wardCode=string(item.ward_code);
  const provinces=await getAdministrativeProvinces(locale);
  const wards=await getAdministrativeWards(provinceCode,locale);
  return addressFrom(item,{
    province:provinces.find(value=>value.code===provinceCode)?.name??provinceCode,
    ward:wards.find(value=>value.code===wardCode)?.name??wardCode,
  });
}

export async function saveShippingAddress(input:SavedAddressInput):Promise<Address>{
  const payload=await accountApi("shipping-address",{
    method:"PUT",
    body:JSON.stringify({recipient_name:input.name,phone_number:input.phone,province_code:input.provinceCode,ward_code:input.wardCode,address:input.address}),
  });
  return addressFrom(payload.data,{province:input.provinceName,ward:input.wardName});
}
