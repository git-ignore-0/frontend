import {EMPTY_SHIPPING_ADDRESS,normalizeVietnamPhone,reviewGuestBuyer,sanitizeVietnamPhoneInput,type ShippingAddressDraft,type ShippingAddressField,type SupportedShippingProvince} from "../../account/shipping-address-model.ts";

export type CsaGuestBuyer=ShippingAddressDraft;

export type CsaGuestIdentity={
  name:string;
  phone:string;
  province_code:string;
  ward_code:string;
  address:string;
};

export type CsaGuestBuyerField=ShippingAddressField;

export const EMPTY_CSA_GUEST_BUYER:CsaGuestBuyer=EMPTY_SHIPPING_ADDRESS;
export {normalizeVietnamPhone,sanitizeVietnamPhoneInput};

export function csaGuestBuyerReview(buyer:CsaGuestBuyer,areas:ReadonlyArray<SupportedShippingProvince>):{complete:boolean;missing:CsaGuestBuyerField[];identity:CsaGuestIdentity|null}{
  const review=reviewGuestBuyer(buyer,areas);
  return {complete:review.complete,missing:review.missing,identity:review.value?{name:review.value.name,phone:review.value.phone,province_code:review.value.provinceCode,ward_code:review.value.wardCode,address:review.value.address}:null};
}
