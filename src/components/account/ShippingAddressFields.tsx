"use client";

import {useState} from "react";
import {Button,FormField,FormInput,FormSelect} from "@/components/UI";
import {SHIPPING_NAME_MAX_LENGTH,sortShippingAreas,type ShippingAddressDraft,type ShippingAddressField,type SupportedShippingProvince} from "@/account/shipping-address-model";
import {copyText} from "@/data/account-copy";
import {handlePhonePaste,normalizeLocalVietnamPhone} from "@/lib/phone-number";
import type {Locale} from "@/types";

export type ShippingAddressFieldsCopy={
  contact?:{name:string;namePlaceholder:string;phone:string};
  province:string;chooseProvince:string;
  ward:string;chooseProvinceFirst:string;chooseWard:string;
  address:string;addressPlaceholder:string;
  loading:string;loadError:string;retry:string;
};

export function ShippingAddressFields({locale,value,areas,loading,error,missing=[],nameMaxLength=SHIPPING_NAME_MAX_LENGTH,copy,onRetry,onChange}:{
  locale:Locale;
  value:ShippingAddressDraft;
  areas:SupportedShippingProvince[];
  loading:boolean;
  error:boolean;
  missing?:ReadonlyArray<ShippingAddressField>;
  nameMaxLength?:number;
  copy:ShippingAddressFieldsCopy;
  onRetry:()=>void;
  onChange:(value:ShippingAddressDraft)=>void;
}){
  const [phoneTouched,setPhoneTouched]=useState(false);
  const provinces=sortShippingAreas(areas,locale);
  const province=provinces.find(item=>item.code===value.provinceCode);
  const wards=province?.wards??[];
  const contact=copy.contact;
  const invalid=(field:ShippingAddressField)=>missing.includes(field);
  const phoneInvalid=invalid("phone")||(phoneTouched&&!!value.phone&&!normalizeLocalVietnamPhone(value.phone));
  const update=(field:ShippingAddressField,next:string)=>onChange({...value,[field]:next});

  return <>
    {contact&&<>
      <FormField label={contact.name}><FormInput name="name" maxLength={nameMaxLength} required placeholder={contact.namePlaceholder} autoComplete="name" value={value.name} aria-invalid={invalid("name")} onChange={event=>update("name",event.target.value)}/></FormField>
      <FormField label={contact.phone}><FormInput name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="09xxxxxxxx" value={value.phone} aria-invalid={phoneInvalid} onBlur={()=>setPhoneTouched(true)} onChange={event=>update("phone",event.target.value)} onPaste={event=>handlePhonePaste(event,next=>update("phone",next))}/>{phoneInvalid&&<span className="help-error" role="alert">{copyText(locale,"profile.invalidPhone")}</span>}</FormField>
    </>}
    <FormField label={copy.province} className="acc-address-field"><FormSelect name="province_code" required value={value.provinceCode} disabled={loading||error} aria-invalid={invalid("provinceCode")} onChange={event=>onChange({...value,provinceCode:event.target.value,wardCode:""})}><option value="">{loading?copy.loading:copy.chooseProvince}</option>{provinces.map(item=><option value={item.code} key={item.code}>{item.name}</option>)}</FormSelect></FormField>
    <FormField label={copy.ward} className="acc-address-field"><FormSelect name="ward_code" required value={value.wardCode} disabled={!province||loading||error} aria-invalid={invalid("wardCode")} onChange={event=>update("wardCode",event.target.value)}><option value="">{!value.provinceCode?copy.chooseProvinceFirst:copy.chooseWard}</option>{wards.map(item=><option value={item.code} key={item.code}>{item.name}</option>)}</FormSelect></FormField>
    <FormField label={copy.address} className="acc-wide acc-address-field"><FormInput name="address" required maxLength={500} autoComplete="street-address" placeholder={copy.addressPlaceholder} value={value.address} aria-invalid={invalid("address")} onChange={event=>update("address",event.target.value)}/></FormField>
    {error&&<div className="help-error acc-wide" role="alert">{copy.loadError} <Button small variant="outline" onClick={onRetry}>{copy.retry}</Button></div>}
  </>;
}
