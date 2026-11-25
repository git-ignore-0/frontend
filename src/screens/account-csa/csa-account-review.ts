import {normalizeVietnamPhone} from "../../lib/phone-number.ts";
import type {Address} from "@/types";

export function csaAccountReview(address?:Address){
  const addressParts=address?[address.detail,address.ward,address.city].map(value=>value.trim()).filter(Boolean):[];
  const complete=Boolean(address?.isSupported&&address.name.trim()&&normalizeVietnamPhone(address.phone)&&address.provinceCode?.trim()&&address.wardCode?.trim()&&address.detail.trim());
  return {complete,addressLabel:addressParts.join(", ")};
}
