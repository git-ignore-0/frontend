import {normalizeVietnamPhone} from "../../account/shipping-address-model.ts";
import type {Address,Profile} from "@/types";

export type CsaAccountField="email"|"address";

export function csaAuthenticatedPendingOwner(profile:Pick<Profile,"email">,address?:Address){
  return {email:profile.email,phone:address?.phone??""};
}

export function csaAccountReview(profile:Pick<Profile,"name"|"phone"|"email">,address?:Address):{
  complete:boolean;
  missing:CsaAccountField[];
  addressKnown:boolean;
  addressLabel:string;
}{
  const missing:CsaAccountField[]=[];
  if(!profile.email.trim())missing.push("email");
  const addressKnown=address!==undefined;
  const addressParts=address?[address.detail,address.ward,address.city].map(value=>value.trim()).filter(Boolean):[];
  const addressComplete=Boolean(address&&address.name.trim()&&normalizeVietnamPhone(address.phone)&&address.provinceCode?.trim()&&address.wardCode?.trim()&&address.detail.trim());
  if(!addressKnown||!addressComplete||address?.isSupported===false)missing.push("address");
  return {complete:missing.length===0,missing,addressKnown,addressLabel:addressParts.join(", ")};
}
