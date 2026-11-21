import type {CsaPurchaseConfirmation} from "@/account/csa-service";
import {normalizeVietnamPhone} from "../../account/shipping-address-model.ts";

export const CSA_PENDING_STORAGE_KEY="nfv:csa-pending:v1";

type PendingMember={subject:string;phone:string;email:string|null};
type StorageLike=Pick<Storage,"getItem"|"setItem"|"removeItem">;
type PendingStores={localStorage:StorageLike;sessionStorage:StorageLike};
type CsaPendingReference={requestCode:string;phone:string};

export function csaPendingStorage(authenticated:boolean,stores:PendingStores):StorageLike|null{
  return authenticated?stores.localStorage:null;
}

export function csaPendingStorageKey(subject:string):string{
  return `${CSA_PENDING_STORAGE_KEY}:${subject}`;
}

export function readCsaPendingSnapshot(storage:StorageLike,subject:string):string|null{
  return storage.getItem(csaPendingStorageKey(subject))??storage.getItem(CSA_PENDING_STORAGE_KEY);
}

function isConfirmation(value:CsaPurchaseConfirmation):boolean{
  return [value.id,value.requestCode,value.status,value.packageName,value.amount,value.initialPaymentAmount,value.expiresAt].every(item=>typeof item==="string"&&item)&&
    Number.isInteger(value.durationMonths)&&value.durationMonths>0;
}

function readCsaPending(raw:string|null){
  if(!raw)return null;
  try{
    const {version,owner,confirmation,reference}=JSON.parse(raw) as {
      version?:number;
      owner?:{subject?:unknown;email?:unknown;phone?:unknown};
      confirmation?:{requestCode?:unknown};
      reference?:{requestCode?:unknown};
    };
    if(!owner||typeof owner.phone!=="string")return null;
    const phone=normalizeVietnamPhone(owner.phone);
    const requestCode=version===1?confirmation?.requestCode:version===2||version===3?reference?.requestCode:null;
    if(!phone||typeof requestCode!=="string"||!requestCode.trim())return null;
    return {version,subject:owner.subject,email:owner.email,reference:{requestCode:requestCode.trim(),phone}};
  }catch{return null;}
}

export function saveCsaPending(storage:StorageLike,subject:string,confirmation:CsaPurchaseConfirmation):void{
  const phone=normalizeVietnamPhone(confirmation.recipientPhone??"");
  if(!subject||!phone||!isConfirmation(confirmation))return;
  const envelope={version:3,owner:{subject,phone},reference:{requestCode:confirmation.requestCode}};
  storage.setItem(csaPendingStorageKey(subject),JSON.stringify(envelope));
}

export function resolveCsaPendingMemberReference(raw:string|null,owner:PendingMember):CsaPendingReference|null{
  const stored=readCsaPending(raw);
  if(!stored||!owner.subject)return null;
  if(stored.version===3)return stored.subject===owner.subject?stored.reference:null;
  const email=owner.email?.trim().toLowerCase();
  return email&&stored.email===email&&stored.reference.phone===normalizeVietnamPhone(owner.phone)?stored.reference:null;
}

export function discardCsaPending(storage:StorageLike,owner:PendingMember,requestCode:string):void{
  if(!owner.subject||!requestCode)return;
  for(const key of [csaPendingStorageKey(owner.subject),CSA_PENDING_STORAGE_KEY]){
    const stored=resolveCsaPendingMemberReference(storage.getItem(key),owner);
    if(stored?.requestCode===requestCode)storage.removeItem(key);
  }
}

export function clearGuestCsaPending(stores:PendingStores):void{
  stores.sessionStorage.removeItem(CSA_PENDING_STORAGE_KEY);
  const stored=readCsaPending(stores.localStorage.getItem(CSA_PENDING_STORAGE_KEY));
  if(stored&&stored.version!==3&&stored.email==="")stores.localStorage.removeItem(CSA_PENDING_STORAGE_KEY);
}
