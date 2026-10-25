import type {CsaPurchaseConfirmation} from "@/account/csa-service";

export const CSA_PENDING_STORAGE_KEY="nfv:csa-pending:v1";

type PendingOwner={email:string;phone:string};
type StorageLike=Pick<Storage,"getItem"|"setItem"|"removeItem">;

type PendingEnvelope={
  version:1;
  owner:{email:string;phone:string};
  confirmation:CsaPurchaseConfirmation;
};

function normalizedOwner(owner:PendingOwner){
  const digits=owner.phone.replace(/\D/g,"");
  return {
    email:owner.email.trim().toLowerCase(),
    phone:digits.startsWith("84")&&digits.length===11?`0${digits.slice(2)}`:digits,
  };
}

function isConfirmation(value:unknown):value is CsaPurchaseConfirmation{
  if(!value||typeof value!=="object"||Array.isArray(value))return false;
  const item=value as Record<string,unknown>;
  return ["id","requestCode","status","packageName","amount","initialPaymentAmount","expiresAt"].every(key=>typeof item[key]==="string"&&item[key])&&
    Number.isInteger(item.durationMonths)&&Number(item.durationMonths)>0;
}

export function saveCsaPending(storage:StorageLike,owner:PendingOwner,confirmation:CsaPurchaseConfirmation):void{
  const normalized=normalizedOwner(owner);
  if(!normalized.email||!normalized.phone||!isConfirmation(confirmation))return;
  const envelope:PendingEnvelope={version:1,owner:normalized,confirmation};
  storage.setItem(CSA_PENDING_STORAGE_KEY,JSON.stringify(envelope));
}

export function parseCsaPending(raw:string|null,owner:PendingOwner,now=Date.now()):CsaPurchaseConfirmation|null{
  const normalized=normalizedOwner(owner);
  if(!normalized.email||!normalized.phone)return null;
  if(!raw)return null;
  try{
    const value=JSON.parse(raw) as Partial<PendingEnvelope>;
    if(value.version!==1||!value.owner||value.owner.email!==normalized.email||value.owner.phone!==normalized.phone||!isConfirmation(value.confirmation))return null;
    const expiresAt=Date.parse(value.confirmation.expiresAt);
    if(!Number.isFinite(expiresAt)||expiresAt<=now)return null;
    return value.confirmation;
  }catch{return null;}
}

export function loadCsaPending(storage:StorageLike,owner:PendingOwner,now=Date.now()):CsaPurchaseConfirmation|null{
  return parseCsaPending(storage.getItem(CSA_PENDING_STORAGE_KEY),owner,now);
}
