"use client";
/* eslint-disable @next/next/no-img-element -- VietQR URL is derived exclusively from Backend payment payload. */

import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from "react";
import {ActionLink,Button,DataState,Icon,Section} from "@/components/UI";
import {ShippingAddressFields} from "@/components/account/ShippingAddressFields";
import {copyText} from "@/data/account-copy";
import {formatDate,formatDateTime} from "@/lib/date-format";
import {siteAccountHref} from "@/auth/site-auth";
import {useAuth} from "@/auth/AuthProvider";
import type {CsaPurchaseConfirmation,CsaPurchaseStatus,CsaQuote} from "@/account/csa-service";
import {confirmCsaTransfer,createCsaPaymentQuote,getCsaPurchaseStatus} from "@/account/csa-service";
import {useSupportedShippingAreas} from "@/hooks/useSupportedShippingAreas";
import {copyTextToClipboard} from "@/account/referral-share";
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
import {csaAccountReview,csaAuthenticatedPendingOwner} from "./csa-account-review";
import {CSA_PENDING_STORAGE_KEY,clearGuestCsaPending,csaPendingMemberPhone,csaPendingStorage,parseCsaPending,saveCsaPending} from "./csa-pending-storage";
import {csaGuestBuyerReview,EMPTY_CSA_GUEST_BUYER,normalizeVietnamPhone,type CsaGuestBuyer} from "./csa-guest-buyer";
import type {SupportedShippingProvince} from "@/account/shipping-address-model";
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
function pendingStorageSnapshot(authenticated:boolean){
  try{return csaPendingStorage(authenticated,window)?.getItem(CSA_PENDING_STORAGE_KEY)??null;}catch{return null;}
}

function Steps({locale,current}:{locale:Locale;current:PurchaseStep}){
  const L=(key:string)=>copyText(locale,key),steps:PurchaseStep[]=["choose","account","terms","payment"];
  const active=Math.max(0,steps.indexOf(current==="pending"?"payment":current));
  return <nav className="csa-buy-steps" aria-label={L("csa.stepsLabel")}>{steps.map((step,index)=><span key={step} className={`csa-buy-step ${index===active?"is-current":index<active?"is-done":""}`} aria-current={index===active?"step":undefined}><span className="index">{index<active?<Icon name="check" size={11}/>:index+1}</span><span>{L(`csa.step.${step}`)}</span></span>)}</nav>;
}

export function AccountCsaPackageSelection(){
  const {ui,data,patch,refreshResource}=useNFV();
  const auth=useAuth();
  const guestMode=auth.status!=="authenticated";
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
  const [statusAttempt,setStatusAttempt]=useState(0);
  const [syncedRequest,setSyncedRequest]=useState<{key:string;value:CsaPurchaseStatus|null;error:boolean}|null>(null);
  const [dismissedRequestCode,setDismissedRequestCode]=useState("");
  const [guest,setGuest]=useState<CsaGuestBuyer>(EMPTY_CSA_GUEST_BUYER);
  const [guestSubmitted,setGuestSubmitted]=useState(false);
  const confirmingRef=useRef(false);
  const L=(key:string)=>copyText(ui.locale,key);
  const shipping=useSupportedShippingAreas(ui.locale,guestMode&&["account","terms","payment"].includes(step));
  const guestReview=csaGuestBuyerReview(guest,shipping.areas);
  const guestIdentity=guestMode?guestReview.identity:null;
  const pendingSnapshot=useCallback(()=>pendingStorageSnapshot(!guestMode),[guestMode]);
  const persistedRaw=useSyncExternalStore(subscribePendingStorage,pendingSnapshot,()=>null);
  const authenticatedOwner=csaAuthenticatedPendingOwner(data.profile,data.shippingAddress??undefined);
  const owner=guestMode?{email:"",phone:guestIdentity?.phone??normalizeVietnamPhone(guest.phone)}:{...authenticatedOwner,phone:authenticatedOwner.phone||csaPendingMemberPhone(persistedRaw,authenticatedOwner.email)||""};
  useEffect(()=>{if(guestMode)try{clearGuestCsaPending(window);}catch{/* Browser storage may be unavailable. */}},[guestMode]);
  const persistedReference=parseCsaPending(persistedRaw,owner);
  const persistedRequestCode=persistedReference?.requestCode??"";
  const statusKey=persistedRequestCode?`${persistedRequestCode}:${owner.phone}`:"";
  useEffect(()=>{
    if(!persistedRequestCode||!statusKey)return;
    let active=true;
    void getCsaPurchaseStatus({requestCode:persistedRequestCode,phone:owner.phone}).then(value=>{
      if(!active)return;
      setSyncedRequest({key:statusKey,value,error:false});
      if(value.status==="approved"&&!guestMode)void refreshResource("csa");
    }).catch(()=>{if(active)setSyncedRequest({key:statusKey,value:null,error:true});});
    return ()=>{active=false;};
  },[guestMode,owner.phone,persistedRequestCode,refreshResource,statusAttempt,statusKey]);
  const officialRequest=confirmation??(syncedRequest?.key===statusKey?syncedRequest.value:null);
  const visibleRequest=officialRequest?.requestCode===dismissedRequestCode?null:officialRequest;

  if(persistedReference&&syncedRequest?.key!==statusKey&&!confirmation)return <Section title={L("csa.pendingRequestTitle")} className="benefit-section csa-account-package-selection"><DataState kind="loading" title={L("state.loadingTitle")} description={L("state.loadingDesc")}/></Section>;
  if(persistedReference&&syncedRequest?.key===statusKey&&syncedRequest.error&&!confirmation)return <Section title={L("csa.pendingRequestTitle")} className="benefit-section csa-account-package-selection"><DataState kind="error" title={L("state.failedTitle")} description={L("state.failedDesc")} action={{label:L("common.retry"),onClick:()=>setStatusAttempt(value=>value+1)}}/></Section>;
  if(visibleRequest)return <AccountCsaPendingStep locale={ui.locale} confirmation={visibleRequest} onTrack={guestMode?()=>patch({accountTab:"csa-tracker",accountHubOpen:false,error:""}):undefined} onDismiss={visibleRequest.status==="rejected"||visibleRequest.status==="expired"?()=>{try{csaPendingStorage(!guestMode,window)?.removeItem(CSA_PENDING_STORAGE_KEY);}catch{/* The terminal Backend result has already been shown. */}setDismissedRequestCode(visibleRequest.requestCode);}:undefined}/>;
  if(status==="loading")return <Section title={L("csa.selectionTitle")} className="benefit-section csa-account-package-selection"><DataState kind="loading" title={L("state.loadingTitle")} description={L("csa.selectionLoading")}/></Section>;
  if(status==="error")return <Section title={L("csa.selectionTitle")} className="benefit-section csa-account-package-selection"><DataState kind="error" title={L("state.failedTitle")} description={L("state.failedDesc")} action={{label:L("common.retry"),onClick:retry}}/></Section>;
  if(!packages?.length)return <Section title={L("csa.selectionTitle")} className="benefit-section csa-account-package-selection"><DataState title={L("csa.noPackagesAvailable")} description={L("csa.noPackagesAvailableDesc")} icon="leaf"/></Section>;

  const current=csaSelectionSummary(packages,selected)?selected:createCsaSelection(packages);
  const back=()=>{setError("");setStep(step==="account"?"choose":step==="terms"?"account":"terms");};
  if(step==="account")return guestMode?<AccountCsaGuestStep locale={ui.locale} buyer={guest} submitted={guestSubmitted} areas={shipping.areas} loading={shipping.loading} error={shipping.error} onRetry={shipping.retry} onChange={value=>{setQuote(null);setGuest(value);}} onBack={back} onContinue={()=>{setGuestSubmitted(true);if(guestReview.complete)setStep("terms");}}/>:<AccountCsaAccountStep locale={ui.locale} profile={data.profile} address={data.shippingAddress??undefined} addressLoading={ui.accountFetchState.address==="loading"} addressError={ui.accountFetchState.address==="error"} onRetryAddress={()=>void refreshResource("address")} onBack={back} onContinue={()=>setStep("terms")}/>;
  if(step==="terms"){
    const accepted=acceptedTerms.length===CSA_TERM_IDS.length;
    const toggle=(id:string,checked:boolean)=>setAcceptedTerms(value=>checked?[...new Set([...value,id])]:value.filter(item=>item!==id));
    const createQuote=async()=>{setTermsSubmitted(true);setError("");if(!accepted||!current||(guestMode&&!guestIdentity))return;setBusy(true);try{const result=await createCsaPaymentQuote({...current,locale:ui.locale,guestIdentity});setQuote(result);setStep("payment");}catch(value){setError(value instanceof Error?value.message:"request_failed");}finally{setBusy(false);}};
    return <div className="benefits-page csa-account-package-selection"><Steps locale={ui.locale} current={step}/><Section title={L("csa.termsTitle")} description={L("csa.termsDescription")} className="benefit-section csa-purchase-step"><div className="csa-terms-list" role="group" aria-describedby={termsSubmitted&&!accepted?"csa-terms-error":undefined}>{CSA_TERMS[ui.locale].map((term,index)=>{const id=CSA_TERM_IDS[index],checked=acceptedTerms.includes(id);return <label className="csa-term-item" htmlFor={id} key={id}><input id={id} name="csa_program_term" type="checkbox" checked={checked} disabled={busy} aria-invalid={termsSubmitted&&!checked} onChange={event=>toggle(id,event.target.checked)}/><span>{term}</span></label>;})}<label className="csa-term-item csa-terms-all" htmlFor="csa-terms-all"><input id="csa-terms-all" type="checkbox" checked={accepted} disabled={busy} aria-controls={CSA_TERM_IDS.join(" ")} onChange={event=>setAcceptedTerms(event.target.checked?[...CSA_TERM_IDS]:[])}/><strong>{L("csa.termsCheckAll")}</strong></label></div>{termsSubmitted&&!accepted&&<p className="help-error" id="csa-terms-error" role="alert">{L("csa.termsRequired")}</p>}{error&&<p className="help-error" role="alert">{L(csaPurchaseErrorKey(error))}</p>}<div className="csa-purchase-actions"><Button variant="outline" disabled={busy} onClick={back}><Icon name="back" size={16}/>{L("csa.back")}</Button><Button loading={busy} disabled={!accepted} onClick={()=>void createQuote()}>{L("csa.createPayment")}</Button></div></Section></div>;
  }
  if(step==="payment"&&quote)return <AccountCsaPaymentStep locale={ui.locale} quote={quote} busy={busy} error={error} onBack={back} onConfirm={async()=>{if(confirmingRef.current||csaQuoteExpired(quote.expiresAt)||(guestMode&&!guestIdentity))return;confirmingRef.current=true;setBusy(true);setError("");try{const result=await confirmCsaTransfer(quote.quoteToken,guestIdentity);try{const storage=csaPendingStorage(!guestMode,window);if(storage)saveCsaPending(storage,owner,result);}catch{/* The Backend response still controls the current-session state. */}setConfirmation(result);setStep("pending");}catch(value){setError(value instanceof Error?value.message:"request_failed");}finally{confirmingRef.current=false;setBusy(false);}}}/>;
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

export function AccountCsaAccountStep({locale,profile,address,addressLoading=false,addressError=false,onRetryAddress,onBack,onContinue}:{locale:Locale;profile:Pick<Profile,"name"|"phone"|"email">;address?:Address;addressLoading?:boolean;addressError?:boolean;onRetryAddress?:()=>void;onBack:()=>void;onContinue:()=>void}){
  const L=(key:string)=>copyText(locale,key),review=csaAccountReview(profile,address);
  return <div className="benefits-page csa-account-package-selection"><Steps locale={locale} current="account"/><Section title={L("csa.accountTitle")} className="benefit-section csa-purchase-step">{addressLoading?<DataState kind="loading" title={L("state.loadingTitle")} description={L("state.loadingDesc")}/>:addressError?<DataState kind="error" title={L("state.failedTitle")} description={L("state.failedDesc")} action={onRetryAddress?{label:L("common.retry"),onClick:onRetryAddress}:undefined}/>:<><p className="csa-purchase-intro">{L("csa.accountDescription")}</p><div className="csa-status-line"><span className={`acc-status ${review.complete?"completed":"processing"}`}>{L("csa.signedIn")}</span><span className="muted">{L("csa.accountManaged")}</span></div><div className="csa-profile-row"><span>{L("profile.name")}</span><strong>{profile.name||L("common.na")}</strong></div><div className="csa-profile-row"><span>{L("profile.phone")}</span><strong>{profile.phone||L("common.na")}</strong></div><div className="csa-profile-row"><span>{L("profile.email")}</span><strong>{profile.email||L("common.na")}</strong></div><div className="csa-profile-row"><span>{L("csa.deliveryAddress")}</span><strong>{review.addressLabel||L("common.na")}</strong></div>{!review.complete&&<p className="help-error" role="alert">{L("csa.accountIncomplete")}</p>}<div className="csa-purchase-actions"><Button variant="outline" onClick={onBack}><Icon name="back" size={16}/>{L("csa.back")}</Button><ActionLink variant="outline" href={siteAccountHref(locale,`/account/${locale}?tab=address`)}>{L("csa.editAccount")}</ActionLink><Button disabled={!review.complete} onClick={onContinue}>{L("csa.continue")}<Icon name="arrow" size={16}/></Button></div></>}</Section></div>;
}

export function AccountCsaGuestStep({locale,buyer,submitted,areas,loading,error,onRetry,onChange,onBack,onContinue}:{locale:Locale;buyer:CsaGuestBuyer;submitted:boolean;areas:SupportedShippingProvince[];loading:boolean;error:boolean;onRetry:()=>void;onChange:(value:CsaGuestBuyer)=>void;onBack:()=>void;onContinue:()=>void}){
  const L=(key:string)=>copyText(locale,key),review=csaGuestBuyerReview(buyer,areas);
  return <div className="benefits-page csa-account-package-selection"><Steps locale={locale} current="account"/><Section title={L("csa.accountTitle")} className="benefit-section csa-purchase-step"><p className="csa-purchase-intro">{L("csa.guestAccountDescription")}</p><form className="acc-form-grid csa-guest-buyer-form" noValidate onSubmit={event=>{event.preventDefault();onContinue();}}>
    <ShippingAddressFields locale={locale} value={buyer} areas={areas} loading={loading} error={error} missing={submitted?review.missing:[]} onRetry={onRetry} onChange={onChange} copy={{name:L("profile.name"),namePlaceholder:L("profile.name"),phone:L("profile.phone"),province:L("csa.guestProvince"),chooseProvince:L("csa.guestChooseProvince"),ward:L("csa.guestWard"),chooseProvinceFirst:L("csa.guestChooseProvince"),chooseWard:L("csa.guestChooseWard"),address:L("csa.guestAddress"),addressPlaceholder:L("csa.guestAddress"),loading:L("common.loading"),loadError:L("csa.guestUnitsError"),retry:L("common.retry")}}/>
    {submitted&&!review.complete&&<p className="help-error csa-guest-form-error" role="alert">{L("csa.guestIncomplete")}</p>}
    <div className="csa-purchase-actions"><Button variant="outline" onClick={onBack}><Icon name="back" size={16}/>{L("csa.back")}</Button><Button type="submit" disabled={loading||error}>{L("csa.continue")}<Icon name="arrow" size={16}/></Button></div>
  </form></Section></div>;
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

export function csaQuoteExpired(expiresAt:string,now=Date.now()):boolean{
  const expiry=Date.parse(expiresAt);
  return !Number.isFinite(expiry)||expiry<=now;
}

export function csaVietQrImageUrl(quote:CsaQuote):string{
  const qr=quote.qr,payment=quote.payment;
  if(!/^\d{6}$/.test(qr.acqId)||!/^\d+$/.test(qr.accountNo)||!/^\d+$/.test(qr.amount)||!qr.accountName.trim()||!qr.addInfo.trim()||qr.acqId!==payment.bankCode||qr.accountNo!==payment.accountNumber||qr.accountName!==payment.accountName||qr.addInfo!==payment.transferContent||qr.amount!==payment.amount||qr.amount!==quote.summary.initialPaymentAmount)return "";
  const path=`${qr.acqId}-${qr.accountNo}-qr_only.png`;
  const query=new URLSearchParams({amount:qr.amount,addInfo:qr.addInfo,accountName:qr.accountName});
  return `https://img.vietqr.io/image/${path}?${query}`;
}

export function AccountCsaPaymentStep({locale,quote,busy,error,onBack,onConfirm}:{locale:Locale;quote:CsaQuote;busy:boolean;error:string;onBack:()=>void;onConfirm:()=>void}){
  const L=(key:string,vars?:Record<string,string|number>)=>copyText(locale,key,vars);
  const [qrFailed,setQrFailed]=useState(false),[now,setNow]=useState(()=>Date.now()),[copied,setCopied]=useState<"account"|"content"|null>(null);
  const qrUrl=csaVietQrImageUrl(quote),qrReady=Boolean(qrUrl&&!qrFailed),expired=csaQuoteExpired(quote.expiresAt,now);
  const transferReady=Boolean(quote.payment.bankName&&quote.payment.accountNumber&&quote.payment.accountName&&quote.payment.transferContent&&quote.payment.amount===quote.summary.initialPaymentAmount);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(timer);},[]);
  const copyValue=async(kind:"account"|"content",value:string)=>{try{await copyTextToClipboard(value);setCopied(kind);}catch{setCopied(null);}};
  return <div className="benefits-page csa-account-package-selection"><Steps locale={locale} current="payment"/><Section title={L("csa.paymentTitle")} className="benefit-section csa-purchase-step">{quote.summary.paymentType==="installment"&&<div className="csa-bank-details"><div><span>{L("csa.installmentSchedule")}</span><strong>{quote.summary.installments.map(item=>L("csa.installmentRow",{sequence:item.sequence,amount:csaMoney(item.amount,locale),cycles:item.cycleCount})).join(" · ")}</strong></div></div>}<div className="csa-qr-area"><div className="csa-qr-panel">{qrReady?<div className="csa-qr-frame"><div className="csa-qr-image"><img className="csa-qr-code" src={qrUrl} alt={L("csa.qrAlt")} onError={()=>setQrFailed(true)}/><img className="csa-qr-logo" src="/images/logo-mark.png" alt="" aria-hidden="true"/></div></div>:<div className="csa-qr-frame csa-qr-unavailable"><Icon name="alert" size={25}/><span>{L("csa.qrUnavailable")}</span></div>}</div><div className="csa-payment-information"><div className="csa-payment-primary"><span>{quote.summary.paymentType==="installment"?L("csa.firstPayment"):L("csa.paymentAmount")}</span><strong>{csaMoney(quote.payment.amount,locale)}</strong></div>{quote.summary.paymentType==="installment"&&<div className="csa-payment-total"><span>{L("csa.contractTotal")}</span><strong>{csaMoney(quote.summary.totalAmount,locale)}</strong></div>}<dl className="csa-transfer-details"><div className="csa-transfer-row"><dt>{L("csa.bank")}</dt><dd><strong>{quote.payment.bankName}</strong></dd></div><div className="csa-transfer-row"><dt>{L("csa.accountNumber")}</dt><dd><strong>{quote.payment.accountNumber}</strong><button type="button" className="csa-copy-button" aria-label={L(copied==="account"?"csa.copied":"csa.copyAccountNumber")} title={L(copied==="account"?"csa.copied":"csa.copyAccountNumber")} disabled={busy} onClick={()=>void copyValue("account",quote.payment.accountNumber)}><Icon name={copied==="account"?"check":"copy"} size={15}/></button></dd></div><div className="csa-transfer-row"><dt>{L("csa.accountName")}</dt><dd><strong>{quote.payment.accountName}</strong></dd></div><div className="csa-transfer-row csa-transfer-content"><dt>{L("csa.transferContent")}</dt><dd><strong>{quote.payment.transferContent}</strong><button type="button" className="csa-copy-button" aria-label={L(copied==="content"?"csa.copied":"csa.copyTransferContent")} title={L(copied==="content"?"csa.copied":"csa.copyTransferContent")} disabled={busy} onClick={()=>void copyValue("content",quote.payment.transferContent)}><Icon name={copied==="content"?"check":"copy"} size={15}/></button></dd></div></dl></div></div><p className="csa-quote-expiry">{L("csa.quoteExpires")}: {formatDateTime(quote.expiresAt)}</p>{(expired||error)&&<p className="help-error" role="alert">{L(expired?"csa.quoteExpiredError":csaPurchaseErrorKey(error))}</p>}<div className="csa-purchase-actions"><Button variant="outline" disabled={busy} onClick={onBack}><Icon name="back" size={16}/>{L("csa.back")}</Button><Button loading={busy} disabled={busy||expired||!transferReady} onClick={onConfirm}>{L("csa.confirmTransfer")}</Button></div></Section></div>;
}

export function AccountCsaPendingStep({locale,confirmation,onTrack,onDismiss}:{locale:Locale;confirmation:CsaPurchaseConfirmation|CsaPurchaseStatus;onTrack?:()=>void;onDismiss?:()=>void}){
  const L=(key:string,vars?:Record<string,string|number>)=>copyText(locale,key,vars);
  const approved=confirmation.status==="approved",rejected=confirmation.status==="rejected",expired=confirmation.status==="expired";
  const waiting=!approved&&!rejected&&!expired;
  const statusKey=approved?"csa.requestApproved":rejected?"csa.requestRejected":expired?"csa.requestExpired":"csa.pendingTitle";
  const descriptionKey=approved?"csa.approvedScheduledDescription":rejected?"csa.rejectedDescription":"csa.expiredDescription";
  const statusTone=approved?"completed":rejected||expired?"error":"processing";
  const tracker=confirmation as CsaPurchaseStatus;
  return <div className="benefits-page csa-account-package-selection"><Section title={L("csa.pendingRequestTitle")} className="benefit-section csa-purchase-step"><div className="benefit-plan-title"><strong>{confirmation.packageName} · {L("csa.monthCount",{count:confirmation.durationMonths})}</strong><span className={`acc-status ${statusTone}`}>{L(statusKey)}</span></div>{!waiting&&<><div className="benefit-detail-grid"><div className="benefit-info-row"><span>{L("csa.requestCode")}</span><strong>{confirmation.requestCode}</strong></div><div className="benefit-info-row"><span>{L("csa.paymentAmount")}</span><strong>{csaMoney(confirmation.initialPaymentAmount,locale)}</strong></div><div className="benefit-info-row"><span>{L("csa.paymentStatus")}</span><strong>{L(approved?"csa.requestApproved":rejected?"csa.requestRejected":"csa.requestExpired")}</strong></div>{approved&&tracker.membershipStartDate&&<div className="benefit-info-row"><span>{L("csa.membershipStarts")}</span><strong>{formatDate(tracker.membershipStartDate)}</strong></div>}{rejected&&tracker.rejectionReason&&<div className="benefit-info-row"><span>{L("csa.rejectionReason")}</span><strong>{tracker.rejectionReason}</strong></div>}</div><div className="csa-notice csa-condensed">{L(descriptionKey)}</div></>}{(onTrack||onDismiss)&&<div className="csa-purchase-actions">{onTrack&&<Button variant="outline" onClick={onTrack}>{L("csa.openTracker")}</Button>}{onDismiss&&<Button onClick={onDismiss}>{L("csa.chooseAgain")}</Button>}</div>}</Section></div>;
}
