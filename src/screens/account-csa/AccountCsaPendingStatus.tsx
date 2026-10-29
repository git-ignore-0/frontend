"use client";

import {useEffect,useState} from "react";
import {DataState,Section} from "@/components/UI";
import {getCsaPurchaseStatus,type CsaPurchaseStatus} from "@/account/csa-service";
import {copyText} from "@/data/account-copy";
import {useNFV} from "@/state/NFVContext";
import {AccountCsaPendingStep} from "./AccountCsaPackageSelection";
import {CSA_PENDING_STORAGE_KEY,csaPendingStorage,resolveCsaPendingMemberReference} from "./csa-pending-storage";

function readPendingReference(email:string,profilePhone?:string,shippingPhone?:string){
  try{const storage=csaPendingStorage(true,window),raw=storage?.getItem(CSA_PENDING_STORAGE_KEY)??null;return {storage,...resolveCsaPendingMemberReference(raw,email,profilePhone,shippingPhone)};}
  catch{return {storage:null,reference:null,phone:""};}
}

export function AccountCsaPendingStatus(){
  const {data,ui,refreshResource}=useNFV(),L=(key:string)=>copyText(ui.locale,key);
  const [attempt,setAttempt]=useState(0),[loading,setLoading]=useState(false),[error,setError]=useState(false),[request,setRequest]=useState<CsaPurchaseStatus|null>(null);
  const email=data.profile.email.trim().toLowerCase();
  const profilePhone=data.profile.phone,shippingPhone=data.shippingAddress?.phone;
  useEffect(()=>{let active=true;void Promise.resolve().then(async()=>{const {reference,phone}=readPendingReference(email,profilePhone,shippingPhone);if(!reference||!phone){if(active){setRequest(null);setLoading(false);setError(false);}return;}if(active){setLoading(true);setError(false);}try{const value=await getCsaPurchaseStatus({requestCode:reference.requestCode,phone});if(!active)return;setRequest(value);if(value.status==="approved")void refreshResource("csa");}catch{if(active)setError(true);}finally{if(active)setLoading(false);}});return()=>{active=false;};},[attempt,email,profilePhone,shippingPhone,refreshResource]);
  const dismiss=()=>{readPendingReference(email,profilePhone,shippingPhone).storage?.removeItem(CSA_PENDING_STORAGE_KEY);setRequest(null);setError(false);};
  if(loading)return <Section title={L("csa.pendingRequestTitle")} className="benefit-section csa-account-pending"><DataState compact kind="loading" title={L("state.loadingTitle")}/></Section>;
  if(error)return <Section title={L("csa.pendingRequestTitle")} className="benefit-section csa-account-pending"><DataState compact kind="error" title={L("state.failedTitle")} action={{label:L("common.retry"),onClick:()=>setAttempt(value=>value+1)}}/></Section>;
  if(!request)return null;
  const dismissible=request.status==="approved"||request.status==="rejected"||request.status==="expired";
  return <AccountCsaPendingStep locale={ui.locale} confirmation={request} onDismiss={dismissible?dismiss:undefined}/>;
}
