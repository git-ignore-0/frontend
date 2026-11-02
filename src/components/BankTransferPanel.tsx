"use client";

/* eslint-disable @next/next/no-img-element -- Validated VietQR payment snapshot. */
import {useState} from "react";
import {useNFV} from "@/state/NFVContext";
import {Icon} from "@/components/UI";

type Labels={bank:string;account:string;name:string;content:string;amount:string;copyAccount:string;copyContent:string;copied:string;qrAlt:string;qrFailed:string};

export function PaymentQr({url,alt,fallback}:{url:string;alt:string;fallback:string}){
 const [failed,setFailed]=useState(false);
 return failed||!url
  ?<div className="csa-qr-frame csa-qr-unavailable" role="status"><Icon name="alert" size={25}/><span>{fallback}</span></div>
  :<div className="csa-qr-frame"><div className="csa-qr-image"><img className="csa-qr-code" src={url} alt={alt} onError={()=>setFailed(true)}/><img className="csa-qr-logo" src="/images/logo-mark.png" alt="" aria-hidden="true"/></div></div>;
}

/** Shared bank-transfer presentation from the CSA purchase flow. */
export function BankTransferPanel({qrUrl,bankName,accountNumber,accountName,transferContent,amount,total,labels,busy=false,appearance="csa"}:{qrUrl:string;bankName:string;accountNumber:string;accountName:string;transferContent:string;amount:string;total?:{label:string;value:string};labels:Labels;busy?:boolean;appearance?:"csa"|"store"}){
 const {copyToClipboard}=useNFV();
 const [copied,setCopied]=useState<"account"|"content"|null>(null);
 const copy=async(kind:"account"|"content",value:string)=>{setCopied(null);if(await copyToClipboard(value))setCopied(kind)};
 const copyButton=(kind:"account"|"content",value:string)=>{
  const label=copied===kind?labels.copied:kind==="account"?labels.copyAccount:labels.copyContent;
  return <button type="button" className={appearance==="store"?"icon-btn":"csa-copy-button"} aria-label={label} title={label} disabled={busy} onClick={()=>void copy(kind,value)}><Icon name={copied===kind?"check":"copy"} size={15}/></button>;
 };
 return <div className="bank-transfer"><div className="csa-qr-area">
  <div className="csa-qr-panel"><PaymentQr key={qrUrl} url={qrUrl} alt={labels.qrAlt} fallback={labels.qrFailed}/></div>
  <div className="csa-payment-information">
   <div className="csa-payment-primary"><span>{labels.amount}</span><strong>{amount}</strong></div>
   {total&&<div className="csa-payment-total"><span>{total.label}</span><strong>{total.value}</strong></div>}
   <dl className="csa-transfer-details">
    <div className="csa-transfer-row"><dt>{labels.bank}</dt><dd><strong>{bankName}</strong></dd></div>
    <div className="csa-transfer-row"><dt>{labels.account}</dt><dd><strong>{accountNumber}</strong>{copyButton("account",accountNumber)}</dd></div>
    <div className="csa-transfer-row"><dt>{labels.name}</dt><dd><strong>{accountName}</strong></dd></div>
    <div className="csa-transfer-row csa-transfer-content"><dt>{labels.content}</dt><dd><strong>{transferContent}</strong>{copyButton("content",transferContent)}</dd></div>
   </dl>
  </div>
 </div></div>;
}
