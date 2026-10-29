import type {CsaPurchaseConfirmation} from "@/account/csa-service";

export const CSA_PENDING_STORAGE_KEY="nfv:csa-pending:v1";

type PendingOwner={email:string;phone:string};
type StorageLike=Pick<Storage,"getItem"|"setItem"|"removeItem">;
type PendingStores={localStorage:StorageLike;sessionStorage:StorageLike};
export type CsaPendingReference={requestCode:string};

type PendingEnvelope={
  version:2;
  owner:{email:string;phone:string};
  reference:CsaPendingReference;
};

function normalizedOwner(owner:PendingOwner){
  const digits=owner.phone.replace(/\D/g,"");
  return {
    email:owner.email.trim().toLowerCase(),
    phone:digits.startsWith("84")&&digits.length===11?`0${digits.slice(2)}`:digits,
  };
}

export function csaPendingStorage(authenticated:boolean,stores:PendingStores):StorageLike|null{
  return authenticated?stores.localStorage:null;
}

function isConfirmation(value:unknown):value is CsaPurchaseConfirmation{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const item=value as Record<string,unknown>;
  return ["id","requestCode","status","packageName","amount","initialPaymentAmount","expiresAt"].every(key=>typeof item[key]==="string"&&item[key])&&
    Number.isInteger(item.durationMonths)&&Number(item.durationMonths)>0;
}

function requestCode(value:unknown):string|null{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const item=value as Record<string,unknown>;
  return typeof item.requestCode==="string"&&item.requestCode.trim()?item.requestCode.trim():null;
}

export function saveCsaPending(storage:StorageLike,owner:PendingOwner,confirmation:CsaPurchaseConfirmation):void{
  const normalized=normalizedOwner(owner);
  if(!normalized.phone||!isConfirmation(confirmation))return;
  const envelope:PendingEnvelope={version:2,owner:normalized,reference:{requestCode:confirmation.requestCode}};
  storage.setItem(CSA_PENDING_STORAGE_KEY,JSON.stringify(envelope));
}

export function parseCsaPending(raw:string|null,owner:PendingOwner,now=Date.now()):CsaPendingReference|null{
  void now;
  const normalized=normalizedOwner(owner);
  if(!normalized.phone)return null;
  if(!raw)return null;
  try{
    const value=JSON.parse(raw) as Record<string,unknown>;
    const storedOwner=value.owner as Record<string,unknown>|undefined;
    if(!storedOwner||storedOwner.email!==normalized.email||storedOwner.phone!==normalized.phone)return null;
    const code=value.version===2?requestCode(value.reference):value.version===1?requestCode(value.confirmation):null;
    return code?{requestCode:code}:null;
  }catch{return null;}
}

export function csaPendingGuestPhone(raw:string|null):string|null{
  if(!raw)return null;
  try{
    const value=JSON.parse(raw) as Record<string,unknown>,storedOwner=value.owner as Record<string,unknown>|undefined;
    if(value.version!==2||!storedOwner||storedOwner.email!==""||typeof storedOwner.phone!=="string"||!requestCode(value.reference))return null;
    const phone=normalizedOwner({email:"",phone:storedOwner.phone}).phone;
    return phone&&phone===storedOwner.phone?phone:null;
  }catch{return null;}
}

export function csaPendingMemberPhone(raw:string|null,email:string):string|null{
  if(!raw)return null;
  try{
    const value=JSON.parse(raw) as Record<string,unknown>,storedOwner=value.owner as Record<string,unknown>|undefined;
    const normalizedEmail=email.trim().toLowerCase();
    if(value.version!==2||!normalizedEmail||!storedOwner||storedOwner.email!==normalizedEmail||typeof storedOwner.phone!=="string"||!requestCode(value.reference))return null;
    const phone=normalizedOwner({email:"",phone:storedOwner.phone}).phone;
    return phone&&phone===storedOwner.phone?phone:null;
  }catch{return null;}
}

export function clearLegacyGuestCsaPending(storage:StorageLike):void{
  if(csaPendingGuestPhone(storage.getItem(CSA_PENDING_STORAGE_KEY)))storage.removeItem(CSA_PENDING_STORAGE_KEY);
}

export function clearGuestCsaPending(stores:PendingStores):void{
  stores.sessionStorage.removeItem(CSA_PENDING_STORAGE_KEY);
  clearLegacyGuestCsaPending(stores.localStorage);
}

export function loadCsaPending(storage:StorageLike,owner:PendingOwner,now=Date.now()):CsaPendingReference|null{
  return parseCsaPending(storage.getItem(CSA_PENDING_STORAGE_KEY),owner,now);
}
