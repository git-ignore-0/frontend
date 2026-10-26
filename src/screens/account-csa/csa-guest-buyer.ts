export type CsaGuestBuyer={
  name:string;
  phone:string;
  provinceCode:string;
  wardCode:string;
  address:string;
};

export type CsaGuestIdentity={
  name:string;
  phone:string;
  province_code:string;
  ward_code:string;
  address:string;
};

export type CsaGuestBuyerField=keyof CsaGuestBuyer;

export const EMPTY_CSA_GUEST_BUYER:CsaGuestBuyer={name:"",phone:"",provinceCode:"",wardCode:"",address:""};

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

export function csaGuestBuyerReview(buyer:CsaGuestBuyer,provinces?:ReadonlyArray<{code:string}>,wards?:ReadonlyArray<{code:string}>):{complete:boolean;missing:CsaGuestBuyerField[];identity:CsaGuestIdentity|null}{
  const missing:CsaGuestBuyerField[]=[];
  const name=buyer.name.trim(),phone=normalizeVietnamPhone(buyer.phone),provinceCode=buyer.provinceCode.trim(),wardCode=buyer.wardCode.trim(),address=buyer.address.trim();
  if(!name)missing.push("name");
  if(!phone)missing.push("phone");
  if(!provinceCode||(provinces&&!provinces.some(item=>item.code===provinceCode)))missing.push("provinceCode");
  if(!wardCode||(wards&&!wards.some(item=>item.code===wardCode)))missing.push("wardCode");
  if(!address)missing.push("address");
  return {complete:missing.length===0,missing,identity:missing.length?null:{name,phone,province_code:provinceCode,ward_code:wardCode,address}};
}
