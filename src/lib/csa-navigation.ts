import type {Locale} from "@/types";

export type CsaLandingSection="packages";

export function csaLandingHref(locale:Locale,section?:CsaLandingSection):string{
  return `/csa/${locale}${section==="packages"?"#csa-packages":""}`;
}

export function csaPurchaseHref(locale:Locale,packageId?:string|null,page?:number):string{
  const base=`/csa/purchase/${locale}`,value=packageId?.trim();
  if(!value)return base;
  const query=new URLSearchParams({package:value});
  if(Number.isSafeInteger(page)&&Number(page)>0)query.set("page",String(page));
  return `${base}?${query}`;
}

export function csaTrackerHref(locale:Locale):string{
  return `/csa/track/${locale}`;
}
