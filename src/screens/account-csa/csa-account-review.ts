import type {Address,Profile} from "@/types";

export type CsaAccountField="name"|"phone"|"email"|"address";

export function csaAccountReview(profile:Pick<Profile,"name"|"phone"|"email">,address?:Address):{
  complete:boolean;
  missing:CsaAccountField[];
  addressKnown:boolean;
  addressLabel:string;
}{
  const missing:CsaAccountField[]=[];
  if(!profile.name.trim())missing.push("name");
  if(!profile.phone.trim())missing.push("phone");
  if(!profile.email.trim())missing.push("email");
  const addressKnown=address!==undefined;
  const addressParts=address?[address.detail,address.ward,address.city].map(value=>value.trim()).filter(Boolean):[];
  if(!addressKnown||addressParts.length!==3)missing.push("address");
  return {complete:missing.length===0,missing,addressKnown,addressLabel:addressParts.join(", ")};
}
