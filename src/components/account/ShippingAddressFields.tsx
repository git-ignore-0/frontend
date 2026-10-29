"use client";

import {Button,FormField,FormInput,FormSelect} from "@/components/UI";
import {sanitizeVietnamPhoneInput,sortShippingAreas,type ShippingAddressDraft,type ShippingAddressField,type SupportedShippingProvince} from "@/account/shipping-address-model";
import type {Locale} from "@/types";

export type ShippingAddressFieldsCopy={
  name:string;namePlaceholder:string;phone:string;
  province:string;chooseProvince:string;
  ward:string;chooseProvinceFirst:string;chooseWard:string;
  address:string;addressPlaceholder:string;
  loading:string;loadError:string;retry:string;
};

export function ShippingAddressFields({locale,value,areas,loading,error,missing=[],copy,onRetry,onChange}:{
  locale:Locale;
  value:ShippingAddressDraft;
  areas:SupportedShippingProvince[];
  loading:boolean;
  error:boolean;
  missing?:ReadonlyArray<ShippingAddressField>;
  copy:ShippingAddressFieldsCopy;
  onRetry:()=>void;
  onChange:(value:ShippingAddressDraft)=>void;
}){
  const provinces=sortShippingAreas(areas,locale);
  const province=provinces.find(item=>item.code===value.provinceCode);
  const wards=province?.wards??[];
  const invalid=(field:ShippingAddressField)=>missing.includes(field);
  const update=(field:ShippingAddressField,next:string)=>onChange({...value,[field]:next});

  return <>
    <FormField label={copy.name}><FormInput name="name" maxLength={200} required placeholder={copy.namePlaceholder} autoComplete="name" value={value.name} aria-invalid={invalid("name")} onChange={event=>update("name",event.target.value)}/></FormField>
    <FormField label={copy.phone}><FormInput name="phone" type="tel" inputMode="tel" pattern="[+0-9]*" maxLength={13} required autoComplete="tel" placeholder="09xxxxxxxx" value={value.phone} aria-invalid={invalid("phone")} onChange={event=>update("phone",sanitizeVietnamPhoneInput(event.target.value))}/></FormField>
    <FormField label={copy.province} className="acc-address-field"><FormSelect name="province_code" required value={value.provinceCode} disabled={loading||error} aria-invalid={invalid("provinceCode")} onChange={event=>onChange({...value,provinceCode:event.target.value,wardCode:""})}><option value="">{loading?copy.loading:copy.chooseProvince}</option>{provinces.map(item=><option value={item.code} key={item.code}>{item.name}</option>)}</FormSelect></FormField>
    <FormField label={copy.ward} className="acc-address-field"><FormSelect name="ward_code" required value={value.wardCode} disabled={!province||loading||error} aria-invalid={invalid("wardCode")} onChange={event=>update("wardCode",event.target.value)}><option value="">{!value.provinceCode?copy.chooseProvinceFirst:copy.chooseWard}</option>{wards.map(item=><option value={item.code} key={item.code}>{item.name}</option>)}</FormSelect></FormField>
    <FormField label={copy.address} className="acc-wide acc-address-field"><FormInput name="address" required maxLength={500} autoComplete="street-address" placeholder={copy.addressPlaceholder} value={value.address} aria-invalid={invalid("address")} onChange={event=>update("address",event.target.value)}/></FormField>
    {error&&<div className="help-error acc-wide" role="alert">{copy.loadError} <Button small variant="outline" onClick={onRetry}>{copy.retry}</Button></div>}
  </>;
}
