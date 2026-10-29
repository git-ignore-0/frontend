import type {Locale} from "@/types";

export type CsaTermsSection={key:string;heading:string;paragraphs:string[]};
export type CsaTermsDocument={
  version:string;
  locale:Locale;
  content:{title:string;sections:CsaTermsSection[]};
  hash:string;
};

export function csaTermsAcceptanceKey(document:Pick<CsaTermsDocument,"version"|"hash">):string{
  return `${document.version}:${document.hash}`;
}

type JsonRecord=Record<string,unknown>;

function record(value:unknown):JsonRecord{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Invalid CSA terms response");
  return value as JsonRecord;
}

function text(value:unknown,maximum:number):string{
  if(typeof value!=="string"||!value.trim()||value.length>maximum)throw new Error("Invalid CSA terms response");
  return value;
}

function optionalText(value:unknown,maximum:number):string{
  if(typeof value!=="string"||value.length>maximum)throw new Error("Invalid CSA terms response");
  return value;
}

export function parseCsaTerms(raw:unknown):CsaTermsDocument{
  const envelope=record(raw),data=record(envelope.data),content=record(data.content);
  const locale=data.locale;
  if(locale!=="vi"&&locale!=="en")throw new Error("Invalid CSA terms response");
  if(typeof data.hash!=="string"||!/^[a-f0-9]{64}$/u.test(data.hash))throw new Error("Invalid CSA terms response");
  if(!Array.isArray(content.sections)||content.sections.length===0)throw new Error("Invalid CSA terms response");
  const keys=new Set<string>();
  const sections=content.sections.map(value=>{
    const section=record(value),key=text(section.key,80),heading=optionalText(section.heading,300);
    if(!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/u.test(key)||keys.has(key)||!Array.isArray(section.paragraphs)||section.paragraphs.length===0)throw new Error("Invalid CSA terms response");
    keys.add(key);
    return {key,heading,paragraphs:section.paragraphs.map(value=>text(value,10000))};
  });
  return {version:text(data.version,64),locale,content:{title:text(content.title,300),sections},hash:data.hash};
}
