export type SupportedShippingWard={code:string;name:string;shippingFeeVnd:string};
export type SupportedShippingProvince={code:string;name:string;wards:SupportedShippingWard[]};

export type ShippingAddressDraft={
  name:string;
  phone:string;
  provinceCode:string;
  wardCode:string;
  address:string;
};

export type ShippingAddressField=keyof ShippingAddressDraft;

export function shippingWardSortName(name:string):string{
  return name.trim()
    .replace(/^(?:phường|xã|thị trấn|đặc khu|ward|commune|township|special administrative zone|special zone)\s+/iu,"")
    .replace(/\s+(?:ward|commune|township|special administrative zone|special zone)$/iu,"");
}

export function shippingWardTypeRank(name:string):number{
  const value=name.trim();
  if(/^(?:phường|ward)(?:\s|$)|\sward$/iu.test(value))return 0;
  if(/^(?:xã|commune)(?:\s|$)|\scommune$/iu.test(value))return 1;
  if(/^(?:thị trấn|township)(?:\s|$)|\stownship$/iu.test(value))return 2;
  if(/^(?:đặc khu|special administrative zone|special zone)(?:\s|$)|\s(?:special administrative zone|special zone)$/iu.test(value))return 3;
  return 4;
}

export function sortShippingAreas(areas:ReadonlyArray<SupportedShippingProvince>,locale:"vi"|"en"):SupportedShippingProvince[]{
  const collator=new Intl.Collator(locale,{sensitivity:"base",numeric:true});
  return areas.map(area=>({...area,wards:[...area.wards].sort((left,right)=>shippingWardTypeRank(left.name)-shippingWardTypeRank(right.name)||collator.compare(shippingWardSortName(left.name),shippingWardSortName(right.name))||collator.compare(left.name,right.name))}))
    .sort((left,right)=>collator.compare(left.name,right.name));
}

export function sanitizeVietnamPhoneInput(value:string):string{
  const compact=value.replace(/[^\d+]/g,"");
  const sanitized=compact.startsWith("+")?`+${compact.slice(1).replace(/\+/g,"")}`:compact.replace(/\+/g,"");
  return sanitized.slice(0,13);
}

export function normalizeVietnamPhone(value:string):string{
  const compact=value.trim().replace(/[\s().-]/g,"");
  const national=compact.startsWith("+84")?compact.slice(3):compact.startsWith("84")?compact.slice(2):compact.startsWith("0")?compact.slice(1):"";
  return /^[1-9]\d{8,9}$/.test(national)?`+84${national}`:"";
}

export function reviewShippingAddress(draft:ShippingAddressDraft,areas:ReadonlyArray<SupportedShippingProvince>):{
  complete:boolean;
  missing:ShippingAddressField[];
  value:ShippingAddressDraft|null;
}{
  const missing:ShippingAddressField[]=[];
  const value={
    name:draft.name.trim(),
    phone:normalizeVietnamPhone(draft.phone),
    provinceCode:draft.provinceCode.trim(),
    wardCode:draft.wardCode.trim(),
    address:draft.address.trim(),
  };
  const province=areas.find(item=>item.code===value.provinceCode);
  if(!value.name)missing.push("name");
  if(!value.phone)missing.push("phone");
  if(!province)missing.push("provinceCode");
  if(!value.wardCode||!province?.wards.some(item=>item.code===value.wardCode))missing.push("wardCode");
  if(!value.address)missing.push("address");
  return {complete:missing.length===0,missing,value:missing.length?null:value};
}
