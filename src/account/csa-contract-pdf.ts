import {AccountApiError,publicResponse} from "./account-api.ts";

export type CsaContractFile={blob:Blob;filename:string};

export function contractPdfFilename(referenceCode:string,locale:"vi"|"en",version?:number){
  const reference=referenceCode.toUpperCase().replace(/[^A-Z0-9-]/g,"-");
  return `${reference}${version===undefined?"":`.v${version}`}.${locale}.pdf`;
}

export async function readContractPdf(response:Response,expectedFilename:string):Promise<CsaContractFile>{
  const contentType=response.headers.get("content-type")?.split(";",1)[0].trim().toLowerCase();
  const filename=response.headers.get("content-disposition")?.match(/^attachment;\s*filename="?([^";]+)"?$/i)?.[1];
  if(contentType!=="application/pdf"||filename!==expectedFilename)throw new AccountApiError("csa_contract_pdf_unavailable",502);
  const blob=await response.blob();
  const [start,end]=await Promise.all([blob.slice(0,5).text(),blob.slice(-1024).text()]);
  if(start!=="%PDF-"||!end.trimEnd().endsWith("%%EOF"))throw new AccountApiError("csa_contract_pdf_unavailable",502);
  return {blob,filename};
}

export function downloadMembershipContract(url:string,referenceCode:string,locale:"vi"|"en",signal:AbortSignal){
  return publicResponse(url,{signal},true,response=>readContractPdf(response,contractPdfFilename(referenceCode,locale)));
}

export function saveContractPdf(file:CsaContractFile){
  const url=URL.createObjectURL(file.blob);
  try{
    const link=document.createElement("a");
    link.href=url;
    link.download=file.filename;
    link.click();
  }finally{
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
}
