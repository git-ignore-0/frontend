"use client";

import {useRef,useState} from "react";
import {Button,FormField,FormInput,Icon,Section} from "@/components/UI";
import {copyText} from "@/data/account-copy";
import {formatDate,formatDateTime,formatExclusiveEndDate} from "@/lib/date-format";
import {useNFV} from "@/state/NFVContext";
import {csaMoney} from "@/screens/csa/csa-packages-model";
import {normalizeVietnamPhone,sanitizeVietnamPhoneInput} from "./csa-guest-buyer";
import {CsaTrackerApiError,downloadTrackedCsaContract,getTrackedCsaContract,isTrackerSessionExpired,lookupCsaContract,trackerContractMatchesResult,type CsaContractLocale,type CsaTrackerContract,type CsaTrackerResult} from "@/account/csa-tracker-service";

type Locale="vi"|"en";
type TrackerErrorKey=""|"csa.trackerLookupUnavailable"|"csa.trackerSessionExpired"|"csa.trackerContractUnavailable"|"csa.trackerPdfUnavailable"|"csa.trackerInvalidLocale"|"csa.trackerRateLimited"|"csa.trackerGenericError";

function trackerErrorKey(error:unknown):TrackerErrorKey{
  if(!(error instanceof CsaTrackerApiError))return "csa.trackerGenericError";
  return ({csa_tracker_lookup_unavailable:"csa.trackerLookupUnavailable",csa_tracker_session_expired:"csa.trackerSessionExpired",csa_tracker_contract_unavailable:"csa.trackerContractUnavailable",csa_contract_pdf_unavailable:"csa.trackerPdfUnavailable",invalid_contract_locale:"csa.trackerInvalidLocale",rate_limited:"csa.trackerRateLimited",invalid_response:"csa.trackerGenericError",request_failed:"csa.trackerGenericError"} as const)[error.code];
}
type ResultProps={locale:Locale;result:CsaTrackerResult;contract:CsaTrackerContract|null;contractLoading:boolean;error:string;downloading:ReadonlySet<string>;downloadErrors:Record<string,string>;onRetryContract:()=>void;onReset:()=>void;onDownload:(locale:CsaContractLocale,versionId?:string)=>void};

export function AccountCsaTrackerResult({locale,result,contract,contractLoading,error,downloading,downloadErrors,onRetryContract,onReset,onDownload}:ResultProps){
  const L=(key:string,vars?:Record<string,string|number>)=>copyText(locale,key,vars),approved=result.status==="approved"&&contract;
  const statusTone=result.status==="approved"?"completed":result.status==="rejected"||result.status==="expired"?"error":"processing";
  const requestStatusKey=result.status==="payment_confirmed"?"csa.trackerStatus.adminReview":`csa.trackerStatus.${result.status}`;
  const currentVersion=approved?contract.currentVersion:null,downloadLocales=currentVersion?.availableLocales??[];
  const preferredPdfLocale:CsaContractLocale|null=approved&&contract.pdfAvailable&&currentVersion?(downloadLocales.includes(locale)?locale:downloadLocales[0]??null):null;
  const currentDownloadKey=preferredPdfLocale&&currentVersion?`${currentVersion.id}:${preferredPdfLocale}`:"";
  return <div className="benefits-page csa-tracker-result"><Section title={L("csa.trackerResultTitle")} className="benefit-section">
    {approved?<div className="csa-tracker-approved">
      <div className="benefit-plan-title"><strong>{contract.packageName}</strong><span className={`acc-status ${contract.status==="revoked"?"error":"completed"}`}>{L(`csa.trackerContractStatus.${contract.status}`)}</span></div>
      <div className="csa-tracker-approved-summary">
        <div className="benefit-info-row"><span>{L("csa.duration")}</span><strong>{L("csa.monthCount",{count:contract.durationMonths})}</strong></div>
        <div className="benefit-info-row"><span>{L("csa.start")}</span><strong>{formatDate(contract.startDate)}</strong></div>
        <div className="benefit-info-row"><span>{L("csa.end")}</span><strong>{formatExclusiveEndDate(contract.endDate)}</strong></div>
      </div>
      {preferredPdfLocale&&currentVersion&&<div className="csa-tracker-contract-download"><Button variant="outline" loading={downloading.has(currentDownloadKey)} aria-label={L(preferredPdfLocale==="vi"?"csa.trackerDownloadVi":"csa.trackerDownloadEn")} onClick={()=>onDownload(preferredPdfLocale,currentVersion.id)}><Icon name="file" size={15}/>{L("csa.trackerDownloadContract")}</Button></div>}
      {preferredPdfLocale&&downloadErrors[currentDownloadKey]&&<p className="help-error" role="alert">{downloadErrors[currentDownloadKey]}</p>}
    </div>:result.status!=="approved"&&<div className="csa-tracker-overview">
      <div className="csa-tracker-overview-main">
        <div className="benefit-plan-title"><strong>{result.packageName}</strong><span className={`acc-status ${statusTone}`}>{L(requestStatusKey)}</span></div>
        <div className="benefit-detail-grid">
          <div className="benefit-info-row"><span>{L("csa.requestCode")}</span><strong>{result.referenceCode}</strong></div>
          <div className="benefit-info-row"><span>{L("csa.duration")}</span><strong>{L("csa.monthCount",{count:result.durationMonths})}</strong></div><div className="benefit-info-row"><span>{L("csa.paymentAmount")}</span><strong>{csaMoney(result.amount,locale)}</strong></div>
          {(result.status==="pending"||result.status==="payment_confirmed"||result.status==="expired")&&<><div className="benefit-info-row"><span>{L("csa.trackerSubmittedAt")}</span><strong>{formatDateTime(result.createdAt)}</strong></div><div className="benefit-info-row"><span>{L("csa.trackerRequestExpiresAt")}</span><strong>{formatDateTime(result.expiresAt)}</strong></div></>}
          {result.status==="rejected"&&<><div className="benefit-info-row"><span>{L("csa.rejectionReason")}</span><strong>{result.rejectionReason||"—"}</strong></div><div className="benefit-info-row"><span>{L("csa.trackerRefundStatus")}</span><strong>{L(`csa.trackerRefund.${result.refundStatus??"not_applicable"}`)}</strong></div><div className="benefit-info-row"><span>{L("csa.trackerRejectedAt")}</span><strong>{formatDateTime(result.rejectedAt)}</strong></div></>}
        </div>
        {result.status!=="payment_confirmed"&&<div className={`csa-notice csa-condensed${result.status==="rejected"||result.status==="expired"?" is-error":""}`} role="status" aria-live="polite">{L(`csa.trackerNotice.${result.status}`)}</div>}
      </div>
    </div>}
    {result.status==="approved"&&!contract&&<div className="csa-tracker-contract-state"><div className="benefit-plan-title"><strong>{result.packageName}</strong><span className="acc-status completed">{L("csa.trackerStatus.approved")}</span></div>{contractLoading?<p role="status">{L("csa.trackerLoadingContract")}</p>:<Button variant="outline" onClick={onRetryContract}>{L("csa.trackerRetryContract")}</Button>}</div>}
    {error&&<p className="help-error" role="alert">{error}</p>}
    <div className="csa-purchase-actions"><Button variant="outline" onClick={onReset}>{L("csa.trackerNewLookup")}</Button></div>
  </Section></div>;
}

export function AccountCsaTracker(){
  const {ui}=useNFV(),locale=ui.locale,L=(key:string)=>copyText(locale,key);
  const [referenceCode,setReferenceCode]=useState(""),[phone,setPhone]=useState(""),[submitted,setSubmitted]=useState(false),[loading,setLoading]=useState(false);
  const [result,setResult]=useState<CsaTrackerResult|null>(null),[contract,setContract]=useState<CsaTrackerContract|null>(null),[contractLoading,setContractLoading]=useState(false),[errorKey,setErrorKey]=useState<TrackerErrorKey>("");
  const [downloading,setDownloading]=useState<Set<string>>(new Set()),[downloadErrors,setDownloadErrors]=useState<Record<string,string>>({});
  const lookupInFlight=useRef(false),lookupAttempt=useRef(0),contractAttempt=useRef(0),downloadGeneration=useRef(0),downloadsInFlight=useRef(new Set<string>());
  const normalizedPhone=normalizeVietnamPhone(phone),validReference=Boolean(referenceCode.trim()),error=errorKey?L(errorKey):"";
  const resetLookup=(nextError:TrackerErrorKey="")=>{lookupAttempt.current+=1;contractAttempt.current+=1;downloadGeneration.current+=1;downloadsInFlight.current.clear();setReferenceCode("");setPhone("");setSubmitted(false);setLoading(false);setResult(null);setContract(null);setContractLoading(false);setErrorKey(nextError);setDownloading(new Set());setDownloadErrors({});};
  const handleTrackerError=(caught:unknown,fallback:TrackerErrorKey)=>{if(isTrackerSessionExpired(caught)){resetLookup("csa.trackerSessionExpired");return;}setErrorKey(caught instanceof CsaTrackerApiError?trackerErrorKey(caught):fallback);};
  const loadApprovedContract=async(expected:CsaTrackerResult)=>{const attempt=++contractAttempt.current;setContractLoading(true);setErrorKey("");try{const value=await getTrackedCsaContract();if(!trackerContractMatchesResult(expected,value))throw new CsaTrackerApiError("invalid_response",502);if(attempt===contractAttempt.current)setContract(value);}catch(caught){if(attempt===contractAttempt.current)handleTrackerError(caught,"csa.trackerContractUnavailable");}finally{if(attempt===contractAttempt.current)setContractLoading(false);}};
  const performLookup=async()=>{setSubmitted(true);setErrorKey("");if(!validReference||!normalizedPhone||lookupInFlight.current)return;lookupInFlight.current=true;const attempt=++lookupAttempt.current;setLoading(true);setResult(null);setContract(null);try{const value=await lookupCsaContract({referenceCode:referenceCode.trim().toUpperCase(),phone:normalizedPhone});if(attempt!==lookupAttempt.current)return;setResult(value);if(value.status==="approved")await loadApprovedContract(value);}catch(caught){if(attempt===lookupAttempt.current)handleTrackerError(caught,"csa.trackerGenericError");}finally{if(attempt===lookupAttempt.current)setLoading(false);lookupInFlight.current=false;}};
  const download=async(pdfLocale:CsaContractLocale,versionId?:string)=>{const key=`${versionId??"current"}:${pdfLocale}`,generation=downloadGeneration.current;if(!contract||downloadsInFlight.current.has(key))return;const version=versionId?(contract.currentVersion?.id===versionId?contract.currentVersion:contract.versions.find(item=>item.id===versionId)):null;if(versionId&&!version?.availableLocales.includes(pdfLocale)||!versionId&&!contract.availablePdfLocales.includes(pdfLocale))return;downloadsInFlight.current.add(key);setDownloading(new Set(downloadsInFlight.current));setDownloadErrors(current=>({...current,[key]:""}));try{const file=await downloadTrackedCsaContract(pdfLocale,versionId);if(generation!==downloadGeneration.current)return;const url=URL.createObjectURL(file.blob),link=document.createElement("a");link.href=url;link.download=file.filename;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(caught){if(generation!==downloadGeneration.current)return;if(isTrackerSessionExpired(caught))resetLookup("csa.trackerSessionExpired");else setDownloadErrors(current=>({...current,[key]:L(trackerErrorKey(caught))}));}finally{if(generation===downloadGeneration.current){downloadsInFlight.current.delete(key);setDownloading(new Set(downloadsInFlight.current));}}};
  if(result)return <AccountCsaTrackerResult locale={locale} result={result} contract={contract} contractLoading={contractLoading} error={error} downloading={downloading} downloadErrors={downloadErrors} onRetryContract={()=>void performLookup()} onReset={()=>resetLookup()} onDownload={(pdfLocale,versionId)=>void download(pdfLocale,versionId)}/>;
  return <div className="benefits-page csa-tracker-page"><Section title={L("csa.trackerTitle")} description={L("csa.trackerIntro")} className="benefit-section"><form className="acc-form-grid csa-tracker-form" noValidate aria-busy={loading} onSubmit={event=>{event.preventDefault();void performLookup();}}><FormField label={L("csa.trackerReference")}><FormInput name="reference_code" autoComplete="off" spellCheck={false} maxLength={32} value={referenceCode} disabled={loading} aria-invalid={submitted&&!validReference} placeholder={L("csa.trackerReferencePlaceholder")} onChange={event=>setReferenceCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,""))}/>{submitted&&!validReference&&<span className="help-error" role="alert">{L("csa.trackerRequired")}</span>}</FormField><FormField label={L("profile.phone")}><FormInput name="phone" type="tel" inputMode="tel" pattern="[+0-9]*" autoComplete="tel" maxLength={13} value={phone} disabled={loading} aria-invalid={submitted&&!normalizedPhone} placeholder={L("csa.trackerPhonePlaceholder")} onChange={event=>setPhone(sanitizeVietnamPhoneInput(event.target.value))}/>{submitted&&!normalizedPhone&&<span className="help-error" role="alert">{L("csa.trackerInvalidPhone")}</span>}</FormField><div className="csa-tracker-form-actions"><Button type="submit" loading={loading}>{loading?L("csa.trackerLookingUp"):L("csa.trackerLookup")}</Button></div></form>{error&&<div className="csa-tracker-form-error"><p className="help-error" role="alert">{error}</p>{errorKey!=="csa.trackerSessionExpired"&&<Button small variant="outline" onClick={()=>void performLookup()}>{L("common.retry")}</Button>}</div>}</Section></div>;
}
