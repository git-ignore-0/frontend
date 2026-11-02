"use client";

import {ShippingAddressFields} from "@/components/account/ShippingAddressFields";
import {GUEST_BUYER_NAME_MAX_LENGTH,reviewGuestBuyer,type ShippingAddressDraft,type SupportedShippingProvince} from "@/account/shipping-address-model";
import {copyText} from "@/data/account-copy";
import type {Locale} from "@/types";

/** CSA's buyer fields, labels and validation presentation shared by both guest flows. */
export function GuestBuyerFields({locale,value,areas,loading,error,submitted,onRetry,onChange}:{locale:Locale;value:ShippingAddressDraft;areas:SupportedShippingProvince[];loading:boolean;error:boolean;submitted:boolean;onRetry:()=>void;onChange:(value:ShippingAddressDraft)=>void}){
 const L=(key:string)=>copyText(locale,key),review=reviewGuestBuyer(value,areas);
 return <div className="acc-form-grid guest-buyer-fields">
  <ShippingAddressFields nameMaxLength={GUEST_BUYER_NAME_MAX_LENGTH} locale={locale} value={value} areas={areas} loading={loading} error={error} missing={submitted?review.missing:[]} onRetry={onRetry} onChange={onChange} copy={{name:L("profile.name"),namePlaceholder:L("profile.name"),phone:L("profile.phone"),province:L("csa.guestProvince"),chooseProvince:L("csa.guestChooseProvince"),ward:L("csa.guestWard"),chooseProvinceFirst:L("csa.guestChooseProvince"),chooseWard:L("csa.guestChooseWard"),address:L("csa.guestAddress"),addressPlaceholder:L("csa.guestAddress"),loading:L("common.loading"),loadError:L("csa.guestUnitsError"),retry:L("common.retry")}}/>
  {submitted&&!review.complete&&<p className="help-error acc-wide guest-buyer-error" role="alert">{L("csa.guestIncomplete")}</p>}
 </div>;
}
