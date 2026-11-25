import type {ClipboardEvent} from "react";

const countryPrefix="+84";
const localPrefix="0";
const storedPrefixes=[countryPrefix,countryPrefix.slice(1),localPrefix];
const nonDigits=/[^0-9]/;
const nationalPatterns={
  contact:/^[1-9][0-9]{8,9}$/,
  identity:/^(?:[35789][0-9]{8}|2[0-9]{9})$/,
};

export function isCanonicalVietnamPhone(value:unknown,domain:keyof typeof nationalPatterns):value is string{
  return typeof value==="string"&&value.startsWith(countryPrefix)&&nationalPatterns[domain].test(value.slice(countryPrefix.length));
}

function canonicalContact(national:string):string{
  return nationalPatterns.contact.test(national)?countryPrefix+national:"";
}

/** Validate the raw domestic input used by CSA and Store before building API payloads. */
export function normalizeLocalVietnamPhone(value:string):string{
  if(!value.startsWith(localPrefix)||nonDigits.test(value))return "";
  return canonicalContact(value.slice(localPrefix.length));
}

/** Accept previously saved contact values without changing their ownership or meaning. */
export function normalizeVietnamPhone(value:string):string{
  const compact=value.replace(/[\s().-]/g,"");
  const prefix=storedPrefixes.find(prefix=>compact.startsWith(prefix));
  return prefix?canonicalContact(compact.slice(prefix.length)):"";
}

export function formatVietnamPhone(value:string|null|undefined):string{
  const canonical=normalizeVietnamPhone(value??"");
  return canonical?localPrefix+canonical.slice(countryPrefix.length):value??"";
}

export function handlePhonePaste(event:ClipboardEvent<HTMLInputElement>,update:(value:string)=>void):void{
  const text=event.clipboardData.getData("text/plain");
  if(!/[\r\n]/.test(text))return;
  event.preventDefault();
  const {value,selectionStart,selectionEnd}=event.currentTarget;
  // Single-line inputs can discard newlines. Keep them visible as invalid spaces.
  update(value.slice(0,selectionStart??value.length)+text.replace(/[\r\n]/g," ")+value.slice(selectionEnd??value.length));
}

/** Keep the existing international telephone fallback for public site settings. */
export function normalizeTelephoneNumber(value:string):string{
  const trimmed=value.trim();
  const digits=trimmed.replace(/\D/g,"");
  if(digits.length<7||digits.length>15)return "";
  return trimmed.startsWith("+")?"+"+digits:digits;
}
