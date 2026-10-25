"use client";
/* eslint-disable @next/next/no-img-element -- VietQR URL is derived exclusively from Backend payment payload. */

import {useState,useSyncExternalStore} from "react";
import {ActionLink,Button,DataState,Icon,Section} from "@/components/UI";
import {copyText} from "@/data/account-copy";
import {siteAccountHref} from "@/auth/site-auth";
import type {CsaPurchaseConfirmation,CsaQuote} from "@/account/csa-service";
import {confirmCsaTransfer,createCsaPaymentQuote} from "@/account/csa-service";
import {csaMoney,csaQuantity,type CsaPackage} from "@/screens/csa/csa-packages-model";
import {useCsaPackages} from "@/screens/csa/useCsaPackages";
import {useNFV} from "@/state/NFVContext";
import {
  changeCsaPackage,
  changeCsaPaymentPlan,
  changeCsaPriceOption,
  createCsaSelection,
  csaSelectionSummary,
  type CsaSelection,
} from "./csa-selection-model";
import {CSA_TERM_IDS,CSA_TERMS} from "./csa-terms";
import {csaAccountReview} from "./csa-account-review";
import {CSA_PENDING_STORAGE_KEY,parseCsaPending,saveCsaPending} from "./csa-pending-storage";
import type {Address,Profile} from "@/types";

type Locale="vi"|"en";

type ViewProps={
  locale:Locale;
  packages:CsaPackage[];
  selected:CsaSelection|null;
  onSelectPackage:(packageId:string)=>void;
  onSelectDuration:(packageId:string,priceOptionId:string)=>void;
  onSelectPayment:(paymentPlanId:string)=>void;
  onContinue?:()=>void;
};

type PurchaseStep="choose"|"account"|"terms"|"payment"|"pending";

function subscribePendingStorage(listener:()=>void){
  const onStorage=(event:StorageEvent)=>{if(event.key===CSA_PENDING_STORAGE_KEY)listener();};
  window.addEventListener("storage",onStorage);
  return ()=>window.removeEventListener("storage",onStorage);
}
function pendingStorageSnapshot(){
  try{return window.localStorage.getItem(CSA_PENDING_STORAGE_KEY);}catch{return null;}
}

function Steps({locale,current}:{locale:Locale;current:PurchaseStep}){
  const L=(key:string)=>copyText(locale,key),steps:PurchaseStep[]=["choose","account","terms","payment"];
  const active=Math.max(0,steps.indexOf(current==="pending"?"payment":current));
  return <nav className="csa-buy-steps" aria-label={L("csa.stepsLabel")}>{steps.map((step,index)=><span key={step} className={`csa-buy-step ${index===active?"is-current":index<active?"is-done":""}`} aria-current={index===active?"step":undefined}><span className="index">{index<active?<Icon name="check" size={11}/>:index+1}</span><span>{L(`csa.step.${step}`)}</span></span>)}</nav>;
}

export function AccountCsaPackageSelection(){
  const {ui,data}=useNFV();
  const {status,page,retry}=useCsaPackages(ui.locale,1);
  const packages=page?.data;
  const [selected,setSelected]=useState<CsaSelection|null>(null);
  const [step,setStep]=useState<PurchaseStep>("choose");
  const [quote,setQuote]=useState<CsaQuote|null>(null);
  const [confirmation,setConfirmation]=useState<CsaPurchaseConfirmation|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [acceptedTerms,setAcceptedTerms]=useState<string[]>([]);
  const [termsSubmitted,setTermsSubmitted]=useState(false);
  const L=(key:string)=>copyText(ui.locale,key);
  const persistedRaw=useSyncExternalStore(subscribePendingStorage,pendingStorageSnapshot,()=>null);
  const persistedConfirmation=parseCsaPending(persistedRaw,{email:data.profile.email,phone:data.profile.phone});
  const pendingConfirmation=confirmation??persistedConfirmation;

  if((step==="pending"||persistedConfirmation)&&pendingConfirmation)return <AccountCsaPendingStep locale={ui.locale} confirmation={pendingConfirmation}/>;
  if(status==="loading")return <Section title={L("csa.selectionTitle")} className="benefit-section csa-account-package-selection"><DataState kind="loading" title={L("state.loadingTitle")} description={L("csa.selectionLoading")}/></Section>;
  if(status==="error")return <Section title={L("csa.selectionTitle")} className="benefit-section csa-account-package-selection"><DataState kind="error" title={L("state.failedTitle")} description={L("state.failedDesc")} action={{label:L("common.retry"),onClick:retry}}/></Section>;
  if(!packages?.length)return <Section title={L("csa.selectionTitle")} className="benefit-section csa-account-package-selection"><DataState title={L("csa.noPackagesAvailable")} description={L("csa.noPackagesAvailableDesc")} icon="leaf"/></Section>;

  const current=csaSelectionSummary(packages,selected)?selected:createCsaSelection(packages);
  const back=()=>{setError("");setStep(step==="account"?"choose":step==="terms"?"account":"terms");};
  if(step==="account")return <AccountCsaAccountStep locale={ui.locale} profile={data.profile} address={data.addresses[0]} onBack={back} onContinue={()=>setStep("terms")}/>;
  if(step==="terms"){
    const accepted=acceptedTerms.length===CSA_TERM_IDS.length;
    const toggle=(id:string,checked:boolean)=>setAcceptedTerms(value=>checked?[...new Set([...value,id])]:value.filter(item=>item!==id));
    const createQuote=async()=>{setTermsSubmitted(true);setError("");if(!accepted||!current)return;setBusy(true);try{const result=await createCsaPaymentQuote({...current,locale:ui.locale});setQuote(result);setStep("payment");}catch(value){setError(value instanceof Error?value.message:"request_failed");}finally{setBusy(false);}};
    return <div className="benefits-page csa-account-package-selection"><Steps locale={ui.locale} current={step}/><Section title={L("csa.termsTitle")} description={L("csa.termsDescription")} className="benefit-section csa-purchase-step"><div className="csa-terms-list" role="group" aria-describedby={termsSubmitted&&!accepted?"csa-terms-error":undefined}>{CSA_TERMS[ui.locale].map((term,index)=>{const id=CSA_TERM_IDS[index],checked=acceptedTerms.includes(id);return <label className="csa-term-item" htmlFor={id} key={id}><input id={id} name="csa_program_term" type="checkbox" checked={checked} disabled={busy} aria-invalid={termsSubmitted&&!checked} onChange={event=>toggle(id,event.target.checked)}/><span>{term}</span></label>;})}<label className="csa-term-item csa-terms-all" htmlFor="csa-terms-all"><input id="csa-terms-all" type="checkbox" checked={accepted} disabled={busy} aria-controls={CSA_TERM_IDS.join(" ")} onChange={event=>setAcceptedTerms(event.target.checked?[...CSA_TERM_IDS]:[])}/><strong>{L("csa.termsCheckAll")}</strong></label></div>{termsSubmitted&&!accepted&&<p className="help-error" id="csa-terms-error" role="alert">{L("csa.termsRequired")}</p>}{error&&<p className="help-error" role="alert">{L(csaPurchaseErrorKey(error))}</p>}<div className="csa-purchase-actions"><Button variant="outline" disabled={busy} onClick={back}><Icon name="back" size={16}/>{L("csa.back")}</Button><Button loading={busy} disabled={!accepted} onClick={()=>void createQuote()}>{L("csa.createPayment")}</Button></div></Section></div>;
  }
  if(step==="payment"&&quote)return <AccountCsaPaymentStep locale={ui.locale} quote={quote} busy={busy} error={error} onBack={back} onConfirm={async()=>{if(busy)return;setBusy(true);setError("");try{const result=await confirmCsaTransfer(quote.quoteToken);try{saveCsaPending(window.localStorage,{email:data.profile.email,phone:data.profile.phone},result);}catch{/* Keep the current-session pending screen when storage is unavailable. */}setConfirmation(result);setStep("pending");}catch(value){setError(value instanceof Error?value.message:"request_failed");}finally{setBusy(false);}}}/>;
  return <><Steps locale={ui.locale} current="choose"/><AccountCsaPackageSelectionView
    locale={ui.locale}
    packages={packages}
    selected={current}
    onSelectPackage={packageId=>setSelected(value=>{const active=value??current;return active?changeCsaPackage(packages,active,packageId):createCsaSelection(packages);})}
    onSelectDuration={(packageId,priceOptionId)=>setSelected(value=>{
      const active=value??current;
      const base=active?changeCsaPackage(packages,active,packageId):createCsaSelection(packages);
      return base?changeCsaPriceOption(packages,base,priceOptionId):null;
    })}
    onSelectPayment={paymentPlanId=>setSelected(value=>{const active=value??current;return active?changeCsaPaymentPlan(packages,active,paymentPlanId):value;})}
    onContinue={()=>setStep("account")}
  /></>;
}

export function AccountCsaAccountStep({locale,profile,address,onBack,onContinue}:{locale:Locale;profile:Pick<Profile,"name"|"phone"|"email">;address?:Address;onBack:()=>void;onContinue:()=>void}){
  const L=(key:string)=>copyText(locale,key),review=csaAccountReview(profile,address);
  return <div className="benefits-page csa-account-package-selection"><Steps locale={locale} current="account"/><Section title={L("csa.accountTitle")} className="benefit-section csa-purchase-step"><p className="csa-purchase-intro">{L("csa.accountDescription")}</p><div className="csa-status-line"><span className={`acc-status ${review.complete?"completed":"processing"}`}>{L("csa.signedIn")}</span><span className="muted">{L("csa.accountManaged")}</span></div><div className="csa-profile-row"><span>{L("profile.name")}</span><strong>{profile.name||L("common.na")}</strong></div><div className="csa-profile-row"><span>{L("profile.phone")}</span><strong>{profile.phone||L("common.na")}</strong></div><div className="csa-profile-row"><span>{L("profile.email")}</span><strong>{profile.email||L("common.na")}</strong></div><div className="csa-profile-row"><span>{L("csa.deliveryAddress")}</span><strong>{review.addressLabel||L("csa.addressVerifiedByBackend")}</strong></div>{!review.complete&&<p className="help-error" role="alert">{L("csa.accountIncomplete")}</p>}<div className="csa-purchase-actions"><Button variant="outline" onClick={onBack}><Icon name="back" size={16}/>{L("csa.back")}</Button><ActionLink variant="outline" href={siteAccountHref(locale,`/account/${locale}?tab=csa`)}>{L("csa.editAccount")}</ActionLink><Button disabled={!review.complete} onClick={onContinue}>{L("csa.continue")}<Icon name="arrow" size={16}/></Button></div></Section></div>;
}

function csaPurchaseErrorKey(code:string):string{
  if(code==="csa_purchase_auth_account_incomplete")return "csa.profileIncomplete";
  if(code==="csa_purchase_payment_unavailable")return "csa.paymentUnavailable";
  if(code==="csa_purchase_request_open_exists")return "csa.duplicateRequest";
  if(code==="csa_payment_quote_expired")return "csa.quoteExpiredError";
  return "csa.purchaseError";
}

export function AccountCsaPackageSelectionView({locale,packages,selected,onSelectPackage,onSelectDuration,onSelectPayment,onContinue}:ViewProps){
  const L=(key:string,vars?:Record<string,string|number>)=>copyText(locale,key,vars);
  const summary=csaSelectionSummary(packages,selected);
  const selectedPackage=packages.find(item=>item.id===selected?.packageId);
  const selectedOption=selectedPackage?.price_options.find(option=>option.id===selected?.priceOptionId);
  const paymentChoices=selectedOption?.payment_plans??[];

  return <div className="benefits-page csa-account-package-selection">
    <Section title={L("csa.selectionTitle")} className="benefit-section csa-package-selection-section">
      <p className="v2-purchase-brief">{L("csa.selectionDescription")}</p>
      <div className="v2-package-toolbar"><strong>{L("csa.choosePackage")}</strong><span className="v2-scroll-hint">{L("csa.swipeHint")} →</span></div>
      <div className="v2-plan-cards" aria-label={L("csa.choosePackage")}>
        {packages.map(item=>{
          const active=item.id===selected?.packageId;
          const option=active?item.price_options.find(candidate=>candidate.id===selected?.priceOptionId):item.price_options[0];
          return <article className={`v2-plan-card${active?" selected":""}`} key={item.id} data-csa-package-card={item.id}>
            <button type="button" className="v2-plan-head" aria-pressed={active} onClick={()=>onSelectPackage(item.id)}>
              <div className="v2-plan-headline"><div><h3>{item.name}</h3>{item.description&&<p>{item.description}</p>}</div>{active?<span className="v2-plan-selected"><Icon name="check" size={11}/>{L("csa.selected")}</span>:<span className="v2-plan-empty-check" aria-hidden="true"/>}</div>
            </button>
            <div className="csa-package-allocation-v2">
              <h4>{L("csa.includedQuota")}</h4>
              <ul>{item.items.map(product=>{
                const unit=locale==="en"?product.unit_label_en:product.unit_label_vi;
                return <li key={product.product_id}><span>{product.product_name}</span><strong>{csaQuantity(product.unit_size,product.quota_units,locale)} {unit}</strong></li>;
              })}</ul>
            </div>
            {!!item.price_options.length&&<div className="csa-package-price-options-v2" role="group" aria-label={L("csa.chooseDuration")}>
              <h4>{L("csa.chooseDuration")}</h4>
              <div className="v2-duration-list">{item.price_options.map(candidate=>{
                const durationSelected=active&&candidate.id===option?.id;
                return <button type="button" className={`v2-duration-option${durationSelected?" selected":""}`} key={candidate.id} aria-pressed={durationSelected} onClick={()=>onSelectDuration(item.id,candidate.id)}>
                  <span className="v2-duration-title"><strong>{L("csa.monthCount",{count:candidate.duration_months})}</strong>{durationSelected&&<span className="v2-duration-badge">{L("csa.selected")}</span>}</span>
                  <span className="v2-duration-prices"><span><small>{L("csa.monthlyPrice")}</small><b>{csaMoney(candidate.monthly_price_vnd,locale)}</b></span><span><small>{L("csa.packageTotal")}</small><b>{csaMoney(candidate.total_price_vnd,locale)}</b></span></span>
                </button>;
              })}</div>
            </div>}
          </article>;
        })}
      </div>

      {selectedOption&&<div className="v2-package-payment">
        <div className="v2-payment-head"><h3>{L("csa.choosePayment")}</h3><span>{selectedPackage?.name} · {L("csa.monthCount",{count:selectedOption.duration_months})}</span></div>
        <div className="payment-plan-list-v2" role="group" aria-label={L("csa.choosePayment")}>
          {paymentChoices.length?paymentChoices.map(plan=><button type="button" className={`payment-plan-choice-v2${plan.id===selected?.paymentPlanId?" selected":""}`} key={plan.id} aria-pressed={plan.id===selected?.paymentPlanId} onClick={()=>onSelectPayment(plan.id)}>
            <span className="v2-pay-radio" aria-hidden="true"/>
            <span className="v2-pay-body"><strong>{plan.name}</strong><small>{plan.payment_type==="installment"?L("csa.installmentDetail",{count:plan.installment_count,amount:csaMoney(plan.initial_payment_amount,locale)}):L("csa.fullPaymentDetail")}</small><b className="v2-pay-amount">{csaMoney(plan.initial_payment_amount,locale)}</b></span>
          </button>):<button type="button" aria-pressed="true" className="payment-plan-choice-v2 selected">
            <span className="v2-pay-radio" aria-hidden="true"/>
            <span className="v2-pay-body"><strong>{L("csa.fullPayment")}</strong><small>{L("csa.fullPaymentDetail")}</small><b className="v2-pay-amount">{csaMoney(selectedOption.total_price_vnd,locale)}</b></span>
          </button>}
        </div>
      </div>}

      {summary&&<div className="v2-checkout-review" data-csa-selection-summary="true">
        <div className="v2-total-col"><span>{summary.paymentType==="installment"?L("csa.firstPayment"):L("common.total")} · {selectedPackage?.name}</span><strong>{csaMoney(summary.initialPaymentAmount,locale)}</strong></div>
        <Button data-csa-continue="true" disabled={!onContinue} onClick={onContinue}><span>{L("csa.continue")}</span><Icon name="arrow" size={17}/></Button>
      </div>}
      <p className="v2-legal-demo">{L("csa.backendPricingNote")}</p>
    </Section>
  </div>;
}

export function csaVietQrImageUrl(quote:CsaQuote):string{
  const qr=quote.qr,payment=quote.payment;
  if(!/^\d{6}$/.test(qr.acqId)||!/^\d+$/.test(qr.accountNo)||!/^\d+$/.test(qr.amount)||!qr.accountName.trim()||!qr.addInfo.trim()||qr.acqId!==payment.bankCode||qr.accountNo!==payment.accountNumber||qr.accountName!==payment.accountName||qr.addInfo!==payment.transferContent||qr.amount!==payment.amount||qr.amount!==quote.summary.initialPaymentAmount)return "";
  const path=`${qr.acqId}-${qr.accountNo}-qr_only.png`;
  const query=new URLSearchParams({amount:qr.amount,addInfo:qr.addInfo,accountName:qr.accountName});
  return `https://img.vietqr.io/image/${path}?${query}`;
}

export function AccountCsaPaymentStep({locale,quote,busy,error,onBack,onConfirm}:{locale:Locale;quote:CsaQuote;busy:boolean;error:string;onBack:()=>void;onConfirm:()=>void}){
  const L=(key:string)=>copyText(locale,key);
  const [qrFailed,setQrFailed]=useState(false),qrUrl=csaVietQrImageUrl(quote),paymentReady=Boolean(qrUrl&&!qrFailed);
  return <div className="benefits-page csa-account-package-selection"><Steps locale={locale} current="payment"/><Section title={L("csa.paymentTitle")} description={L("csa.paymentDescription")} className="benefit-section csa-purchase-step"><div className="csa-qr-area">{paymentReady?<img className="csa-qr-box" src={qrUrl} alt={L("csa.qrAlt")} onError={()=>setQrFailed(true)}/>:<div className="csa-qr-box csa-qr-unavailable"><Icon name="alert" size={25}/><span>{L("csa.qrUnavailable")}</span></div>}<div><div className="csa-amount">{csaMoney(quote.payment.amount,locale)}</div><p className="sm muted">{L("csa.paymentAmount")}</p><div className="csa-bank-details"><div><span>{L("csa.bank")}</span><strong>{quote.payment.bankName}</strong></div><div><span>{L("csa.accountNumber")}</span><strong>{quote.payment.accountNumber}</strong></div><div><span>{L("csa.accountName")}</span><strong>{quote.payment.accountName}</strong></div></div><div className="csa-request-code"><span>{L("csa.transferContent")}</span><strong>{quote.payment.transferContent}</strong></div></div></div><p className="csa-quote-expiry">{L("csa.quoteExpires")}: {new Date(quote.expiresAt).toLocaleString(locale==="en"?"en-US":"vi-VN")}</p>{error&&<p className="help-error" role="alert">{L(csaPurchaseErrorKey(error))}</p>}<div className="csa-purchase-actions"><Button variant="outline" disabled={busy} onClick={onBack}><Icon name="back" size={16}/>{L("csa.back")}</Button><Button loading={busy} disabled={!paymentReady} onClick={onConfirm}>{L("csa.confirmTransfer")}</Button></div></Section></div>;
}

export function AccountCsaPendingStep({locale,confirmation}:{locale:Locale;confirmation:CsaPurchaseConfirmation}){
  const L=(key:string,vars?:Record<string,string|number>)=>copyText(locale,key,vars);
  return <div className="benefits-page csa-account-package-selection"><Section title={L("csa.pendingRequestTitle")} className="benefit-section csa-purchase-step"><div className="benefit-plan-title"><strong>{confirmation.packageName} · {L("csa.monthCount",{count:confirmation.durationMonths})}</strong><span className="acc-status processing">{L("csa.pendingTitle")}</span></div><div className="benefit-detail-grid"><div className="benefit-info-row"><span>{L("csa.requestCode")}</span><strong>{confirmation.requestCode}</strong></div><div className="benefit-info-row"><span>{L("csa.paymentAmount")}</span><strong>{csaMoney(confirmation.initialPaymentAmount,locale)}</strong></div><div className="benefit-info-row"><span>{L("csa.paymentStatus")}</span><strong>{L("csa.transferReported")}</strong></div></div><div className="csa-notice csa-condensed">{L("csa.pendingDescription")} {L("csa.pendingQuotaNote")}</div><p className="csa-history-helper">{L("csa.pendingReloadNote")}</p></Section></div>;
}
