"use client";

import {useId,useMemo,useRef,useState,useSyncExternalStore,type MouseEvent} from "react";
import {ResponsiveDialog} from "@/components/overlays/OverlayPrimitives";
import {ActionLink,Button} from "@/components/UI";
import {copyText} from "@/data/account-copy";
import {
  buildReferralShareTargets,
  buildReferralUrl,
  copyTextToClipboard,
  messageWithReferralUrl,
} from "@/account/referral-share";
import type {Locale} from "@/types";

type CopyStatus="idle"|"copied"|"failed";

function getClientShareSurface():boolean{
  if(typeof window.matchMedia!=="function")return typeof navigator.share==="function";
  return window.matchMedia("(pointer: coarse)").matches||window.matchMedia("(max-width: 760px)").matches;
}

function getServerShareSurface():null{return null;}

function subscribeShareSurface(update:()=>void):()=>void{
  if(typeof window.matchMedia!=="function")return ()=>{};
  const coarse=window.matchMedia("(pointer: coarse)");
  const narrow=window.matchMedia("(max-width: 760px)");
  coarse.addEventListener("change",update);
  narrow.addEventListener("change",update);
  return ()=>{
    coarse.removeEventListener("change",update);
    narrow.removeEventListener("change",update);
  };
}

function CopyFeedback({status,copied,failed}:{status:CopyStatus;copied:string;failed:string}){
  if(status==="idle")return null;
  return <p className={`referral-share-feedback ${status==="failed"?"is-failed":"is-copied"}`} role={status==="failed"?"alert":"status"} aria-live={status==="failed"?"assertive":"polite"}>{status==="failed"?failed:copied}</p>;
}

function isShareCancellation(error:unknown){
  return typeof error==="object"&&error!==null&&"name" in error&&error.name==="AbortError";
}

export function ReferralShareDialog({code,locale}:{code:string;locale:Locale}){
  const L=(key:string)=>copyText(locale,key);
  const [open,setOpen]=useState(false);
  const [origin,setOrigin]=useState("");
  const [message,setMessage]=useState("");
  const [linkStatus,setLinkStatus]=useState<CopyStatus>("idle");
  const [messageStatus,setMessageStatus]=useState<CopyStatus>("idle");
  const mobileShareSurface=useSyncExternalStore(subscribeShareSurface,getClientShareSurface,getServerShareSurface);
  const nativeShareAvailable=mobileShareSurface!==null&&typeof navigator.share==="function";
  const [sharing,setSharing]=useState(false);
  const [shareError,setShareError]=useState("");
  const triggerRef=useRef<HTMLElement|null>(null);
  const sharingRef=useRef(false);
  const descriptionId=useId();

  const referralUrl=origin?buildReferralUrl(origin,code,locale):"";
  const normalizedMessage=referralUrl?messageWithReferralUrl(message,referralUrl):message;
  const targets=useMemo(()=>origin?buildReferralShareTargets({
    origin,code,locale,message,emailSubject:copyText(locale,"ref.emailShareSubject"),
  }):null,[code,locale,message,origin]);

  function openDialog(event:MouseEvent<HTMLButtonElement>){
    const currentOrigin=window.location.origin;
    const url=buildReferralUrl(currentOrigin,code,locale);
    triggerRef.current=event.currentTarget;
    setOrigin(currentOrigin);
    setMessage(L("ref.defaultShareMessage").replace("{link}",url));
    setLinkStatus("idle");
    setMessageStatus("idle");
    setShareError("");
    setOpen(true);
  }

  async function copyValue(value:string,target:"link"|"message"){
    const setStatus=target==="link"?setLinkStatus:setMessageStatus;
    try{
      await copyTextToClipboard(value);
      setStatus("copied");
    }catch{
      setStatus("failed");
    }
  }

  async function shareViaApps(){
    if(sharingRef.current||typeof navigator.share!=="function")return;
    sharingRef.current=true;
    setSharing(true);
    setShareError("");
    try{
      await navigator.share({title:L("ref.shareDialogTitle"),text:normalizedMessage});
    }catch(error){
      if(!isShareCancellation(error))setShareError(L("ref.nativeShareFailed"));
    }finally{
      sharingRef.current=false;
      setSharing(false);
    }
  }

  return <>
    <Button small onClick={openDialog}>{L("ref.share")}</Button>
    {open&&targets?<ResponsiveDialog title={L("ref.shareDialogTitle")} closeLabel={L("ref.closeShareDialog")} onClose={()=>setOpen(false)} returnRef={triggerRef} className="referral-share-dialog" descriptionId={descriptionId}>
      <p className="referral-share-description" id={descriptionId}>{L("ref.shareDialogDescription")}</p>
      <div className="referral-share-field">
        <label htmlFor="referralShareLink">{L("ref.referralLinkLabel")}</label>
        <div className="referral-share-copy-row">
          <input className="nfv-control" id="referralShareLink" type="url" readOnly value={referralUrl}/>
          <Button small variant="outline" onClick={()=>void copyValue(referralUrl,"link")}>{L("ref.copyLink")}</Button>
        </div>
        <CopyFeedback status={linkStatus} copied={L("ref.linkCopied")} failed={L("ref.linkCopyFailed")}/>
      </div>
      <div className="referral-share-field">
        <label htmlFor="referralShareMessage">{L("ref.shareMessageLabel")}</label>
        <textarea className="nfv-control referral-share-message" id="referralShareMessage" rows={6} value={message} onChange={event=>{setMessage(event.target.value);setMessageStatus("idle");setShareError("");}}/>
        {mobileShareSurface===false?<section className="referral-share-platform-section" aria-labelledby="referralSharePlatformsTitle">
          <h3 id="referralSharePlatformsTitle">{L("ref.shareOn")}</h3>
          <div className="referral-share-platforms">
            <ActionLink small variant="outline" href={targets.facebook} target="_blank" rel="noopener noreferrer" aria-label={L("ref.shareOnFacebook")}>{L("ref.facebook")}</ActionLink>
            <ActionLink small variant="outline" href={targets.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={L("ref.shareViaWhatsApp")}>{L("ref.whatsapp")}</ActionLink>
            <ActionLink small variant="outline" href={targets.email} aria-label={L("ref.shareByEmail")}>{L("ref.email")}</ActionLink>
          </div>
        </section>:null}
        <div className="referral-share-actions">
          {mobileShareSurface===true&&nativeShareAvailable?<Button small loading={sharing} onClick={()=>void shareViaApps()}>{L("ref.shareViaApps")}</Button>:null}
          <Button small variant="outline" onClick={()=>void copyValue(normalizedMessage,"message")}>{L("ref.copyMessage")}</Button>
        </div>
        {shareError?<p className="referral-share-feedback is-failed" role="alert" aria-live="assertive">{shareError}</p>:null}
        <CopyFeedback status={messageStatus} copied={L("ref.messageCopied")} failed={L("ref.messageCopyFailed")}/>
      </div>
    </ResponsiveDialog>:null}
  </>;
}
