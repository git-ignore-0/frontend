"use client";
import {PagedList} from "@/components/account/PagedList";
import {ReferralShareDialog} from "@/components/account/ReferralShareDialog";
/* eslint-disable @next/next/no-img-element -- exact v61 gift-image DOM and unknown backend image URLs. */
import {useRef,useState, type FormEvent, type ReactNode} from "react";
import {IconButton} from "@/components/overlays/OverlayPrimitives";
import {useOverlayDialog} from "@/components/overlays/useOverlayDialog";
import {ActionLink,Button,DataState,Icon,Section,localized} from "@/components/UI";
import {useNFV} from "@/state/NFVContext";
import {copyText} from "@/data/account-copy";
import {AccountCsaPendingStatus} from "@/screens/account-csa/AccountCsaPendingStatus";
import {csaLandingHref} from "@/lib/csa-navigation";
import {dateLabel} from "@/lib/format";
import {beginRedemptionIntent,redemptionRequest} from "@/account/redemption-intent";
import {redemptionErrorCopyKey,redemptionStatus} from "@/account/redemption-presentation";
import {applyRedemptionResult} from "@/account/redemption-state";
import {isReferralCode,normalizeReferralCode,referralErrorCopyKey,referralInvitePresentation} from "@/account/referral-presentation";
import {mergeReferralSummary} from "@/account/referral-state";
import {copyTextToClipboard} from "@/account/referral-share";
import type {AccountTab,CSAQuota,CSAUsage,Gift,Invitee,RewardEntry,Resource,Paged,Referrals} from "@/types";

function MetricBadge({children,tone="neutral"}:{children:ReactNode;tone?:string}){
 return <span className={`acc-status ${({active:"completed",done:"completed",pending:"processing",error:"cancelled",neutral:"neutral"} as Record<string,string>)[tone]||"neutral"}`}>{children}</span>;
}
function BenefitInfoRow({title,value}:{title:string;value?:string|number|null}){
 return <div className="benefit-info-row"><span>{title}</span><strong>{value===null||value===undefined||value===""?"—":value}</strong></div>;
}
export function BenefitTransactionRow({title,meta="",action,badge,amount}:{title:string;meta?:string;action?:ReactNode;badge?:ReactNode;amount?:string}){
 return <article className="benefit-transaction"><div className="benefit-tx-main"><strong>{title||"—"}</strong><small>{meta}</small>{action}</div><div className="benefit-tx-end">{amount&&<strong>{amount}</strong>}{badge}</div></article>;
}
function BenefitSection({title,description,children}:{title:string;description?:string;children:ReactNode}){
 return <Section title={title} description={description} className="benefit-section">{children}</Section>;
}
function Empty({title,description,icon="leaf"}:{title:string;description?:string;icon?:string}){
 return <DataState title={title} description={description} icon={icon}/>;
}
export function BenefitsView({kind}:{kind:Exclude<AccountTab,"orders"|"address"|"profile">}){
 const {ui,refreshResource}=useNFV();
 const resource:Resource=kind==="csa"?"csa":kind==="referrals"?"referrals":"rewards";
 const status=ui.accountFetchState[resource];
 const L=(key:string,vars?:Record<string,string|number>)=>copyText(ui.locale,key,vars);
 if(kind==="csa")return <CSABenefits status={status}/>;
 if(status==="loading")return <section className="acc-section"><DataState kind="loading" title={L("state.loadingTitle")} description={L("state.loadingDesc")}/></section>;
 if(status==="error")return <section className="acc-section"><DataState kind="error" title={L("state.failedTitle")} description={L("state.failedDesc")} action={{label:L("common.retry"),onClick:()=>void refreshResource(resource)}}/></section>;
 if(kind==="referrals")return <ReferralBenefits/>;
 if(kind==="rewards")return <RewardsPoints/>;
 return <RewardsGifts/>;
}
function Balance(){
 const {data,ui}=useNFV();const balance=data.rewards?.balance;
 const L=(key:string)=>copyText(ui.locale,key);
 return <section className="acc-section benefit-section benefit-points-overview" aria-label={L("rewards.available")}><div className="benefit-balance"><span>{L("rewards.available")}</span><strong>{balance===null||balance===undefined||!Number.isFinite(Number(balance))?"—":Number(balance).toLocaleString(ui.locale==="en"?"en-US":"vi-VN")}<small> {L("common.points")}</small></strong></div></section>;
}
function useCursor(){
 const {ui,patch,setData,act,call,data}=useNFV();
 const [error,setError]=useState<Record<string,boolean>>({});
 const next=async(kind:"rewards"|"redemptions"|"gifts"|"referrals",cursor?:string|null)=>{
   const count=kind==="gifts"?8:7;
   const available=kind==="referrals"?(data.referrals?.invitees||data.referrals?.history||[]).length:
     kind==="gifts"?(data.rewards?.gifts||[]).length:
     kind==="rewards"?(data.rewards?.history||[]).length:(data.rewards?.redemptions||[]).length;
   const visible=ui.visible[kind]||count;
   if(visible<available){patch({visible:{...ui.visible,[kind]:visible+count}});return;}
   if(!cursor)return;
   const method=kind==="referrals"?"getReferralsPage":kind==="gifts"?"getRewardGiftsPage":"getRewardHistoryPage";
   const arg=kind==="referrals"||kind==="gifts"?{cursor,limit:count}:{type:kind==="rewards"?"points":"redemptions",cursor,limit:count};
   const res=await act("page:"+kind,()=>call<Paged<unknown>>(method,arg));
   if(!res||!Array.isArray(res.items)){setError(s=>({...s,[kind]:true}));return;}
   if(!res.items.length&&res.nextCursor===cursor){setError(s=>({...s,[kind]:true}));return;}
   if(kind==="referrals"){
     const old=data.referrals;if(!old)return;
     const items=old.invitees||[],known=new Set(items.map(x=>String(x.id)));
     setData(s=>({...s,referrals:{...old,invitees:[...items,...(res.items as Invitee[]).filter(x=>x&&x.id&&!known.has(String(x.id)))],pagination:{...old.pagination,invitees:{nextCursor:res.nextCursor,total:res.total}}}}));
   }else if(data.rewards){
     const name=kind==="gifts"?"gifts":kind==="rewards"?"history":"redemptions";
     const oldEntries=(data.rewards[name]||[]) as {id:string}[],known=new Set(oldEntries.map(x=>String(x.id)));
     const items=res.items.filter(x=>!!x && typeof x==="object" && "id" in x && !known.has(String(x.id)));
     const metaName=kind==="rewards"?"points":kind;
     setData(s=>({...s,rewards:{...s.rewards,...{[name]:[...oldEntries,...items]},pagination:{...s.rewards?.pagination,[metaName]:{nextCursor:res.nextCursor,total:res.total}}}}));
   }
   patch({visible:{...ui.visible,[kind]:(ui.visible[kind]||count)+count}});setError(s=>({...s,[kind]:false}));
 };
 return {next,error,pending:ui.busyKeys};
}
function RewardsHistory({kind}:{kind:"rewards"|"redemptions"}){
 const {data,ui}=useNFV();const {next,error,pending}=useCursor();
 const r=data.rewards,points=kind==="rewards",records=(points?r?.history:r?.redemptions)||[];
 const page=(points?r?.pagination?.points:r?.pagination?.redemptions)||{};
 const L=(key:string)=>copyText(ui.locale,key);
 return <PagedList kind={kind} items={records} nextCursor={page.nextCursor} total={page.total} pending={pending.includes("page:"+kind)} failed={!!error[kind]}
   emptyTitle={L(points?"rewards.noPoints":"rewards.noRedemptions")} onMore={()=>void next(kind,page.nextCursor)}
   render={item=>points?<PointRow item={item} key={item.id}/>:<RedemptionRow item={item} key={item.id}/>}/>;
}
function PointRow({item}:{item:RewardEntry}){
 const {ui}=useNFV();return <div className="benefit-history-item"><BenefitTransactionRow title={ui.locale==="en"&&item.descriptionEn?item.descriptionEn:item.description||"—"} meta={[dateLabel(item.date),item.id].filter(Boolean).join(" · ")} amount={`${item.points>0?"+":""}${item.points} ${copyText(ui.locale,"common.points")}`}/></div>;
}
function RedemptionRow({item}:{item:RewardEntry}){
 const {ui}=useNFV();const L=(key:string)=>copyText(ui.locale,key);
 const {copyKey,tone}=redemptionStatus(item.status);
 return <BenefitTransactionRow title={localized(item as unknown as Record<string,unknown>,"giftName",ui.locale)||item.giftName||"—"}
   meta={[dateLabel(item.date),item.id].join(" · ")} badge={<><MetricBadge tone={tone}>{L(copyKey)}</MetricBadge><small>−{item.points??0} {L("common.points")}</small></>}/>;
}
function RewardsPoints(){
 const {ui}=useNFV();const L=(key:string)=>copyText(ui.locale,key);
 return <div className="benefits-page rewards-page points-page"><Balance/><BenefitSection title={L("rewards.pointsHistory")}><div className="benefit-history-host"><RewardsHistory kind="rewards"/></div></BenefitSection></div>;
}
function GiftThumb({gift}:{gift:Gift}){
 const {ui}=useNFV();const [broken,setBroken]=useState(false);
 return <div className={`benefit-gift-thumb ${broken?"is-missing":""}`}>{gift.image&&!broken&&<img src={gift.image} alt={localized(gift as unknown as Record<string,unknown>,"name",ui.locale)} loading="lazy" onError={()=>setBroken(true)}/>}<span className="benefit-gift-fallback" aria-hidden="true"><Icon name="gift" size={24}/></span></div>;
}
function GiftRow({gift}:{gift:Gift}){
 const {data,ui,patch}=useNFV();const L=(key:string,v?:Record<string,number>)=>copyText(ui.locale,key,v);
 const needed=Math.max(0,Number(gift.points)||0),balance=data.rewards?.balance;
 const enough=balance!=null&&Number.isFinite(+balance)&&+balance>=needed;
 return <article className="benefit-gift" data-gift-id={gift.id}><GiftThumb gift={gift}/><div className="benefit-gift-body"><strong>{localized(gift as unknown as Record<string,unknown>,"name",ui.locale)}</strong><div className="benefit-gift-cost">{L("rewards.need",{points:needed})}</div>
   <div className="benefit-gift-availability"><MetricBadge tone={enough?"active":"neutral"}>{enough?L("rewards.enough"):L("rewards.notEnough",{points:Math.max(0,needed-Number(balance||0))})}</MetricBadge></div></div>
   <Button small variant={enough?"primary":"outline"} disabled={!enough} onClick={()=>patch({giftIntent:beginRedemptionIntent(gift.id)})}>{enough?L("rewards.redeem"):L("rewards.unavailable")}</Button></article>;
}
function GiftModal(){
 const {data,ui,patch,setData,call,act}=useNFV();const intent=ui.giftIntent;const gift=data.rewards?.gifts?.find(g=>g.id===intent?.giftId);
 const panelRef=useRef<HTMLElement>(null);
 const close=()=>{if(!ui.busyKeys.includes("gift:redeem"))patch({giftIntent:null});};
 useOverlayDialog({panelRef,onClose:close});
 if(!gift||!intent)return null;
 const L=(key:string)=>copyText(ui.locale,key),done=intent.phase==="success",error=intent.phase==="error";
 const balance=Number(data.rewards?.balance||0),points=Number(gift.points||0);
 const confirm=async()=>{
   const request=redemptionRequest(intent);
   const res=await act("gift:redeem",()=>call<{accepted:boolean;rewards?:typeof data.rewards;balance?:number;redemption?:RewardEntry}>("redeemGift",request));
   if(res?.accepted!==true){patch({giftIntent:{...intent,phase:"error"}});return;}
   setData(s=>({...s,rewards:res.rewards||(res.redemption&&typeof res.balance==="number"?applyRedemptionResult(s.rewards,{balance:res.balance,redemption:res.redemption}):s.rewards)}));
   patch({giftIntent:{...intent,phase:"success"}});
 };
 return <div className="benefit-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><section ref={panelRef} className="benefit-modal" role="dialog" aria-modal="true" aria-labelledby="giftModalTitle" tabIndex={-1}>
   <div className="benefit-modal-head"><h2 id="giftModalTitle">{L(done?"rewards.successTitle":error?"rewards.errorTitle":"rewards.modalTitle")}</h2><IconButton onClick={close} label={L("common.close")}/></div>
   {done?<p className="benefit-modal-copy">{L("rewards.successDesc")}</p>:error?<p className="benefit-modal-copy" role="alert">{L(redemptionErrorCopyKey(ui.error))}</p>:
   <><p className="benefit-modal-copy">{L("rewards.modalHint")}</p><div className="benefit-modal-gift"><GiftThumb gift={gift}/><div><strong>{localized(gift as unknown as Record<string,unknown>,"name",ui.locale)}</strong><small>{L("rewards.modalCost")}: {points} {L("common.points")}</small></div></div><BenefitInfoRow title={L("rewards.modalRemain")} value={`${Math.max(0,balance-points)} ${L("common.points")}`}/></>}
   <div className="benefit-modal-actions"><Button small variant="outline" disabled={ui.busyKeys.includes("gift:redeem")} onClick={close}>{done?L("common.close"):L("common.cancel")}</Button>{!done&&<Button small loading={ui.busyKeys.includes("gift:redeem")} onClick={()=>void confirm()}>{error?L("rewards.retry"):L("common.confirm")}</Button>}</div>
 </section></div>;
}
function RewardsGifts(){
 const {data,ui}=useNFV();const {next,error,pending}=useCursor();const L=(key:string)=>copyText(ui.locale,key);
 const gifts=data.rewards?.gifts||[],meta=data.rewards?.pagination?.gifts||{};
 return <div className="benefits-page redeem-page"><Balance/>
   <BenefitSection title={L("rewards.gifts")} description={L("rewards.giftsDesc")}>
     <div data-benefit-gifts="true"><PagedList kind="gifts" items={gifts} pageSize={8} className="benefit-gift-list" emptyTitle={L("rewards.noGifts")}
       nextCursor={meta.nextCursor} total={meta.total} pending={pending.includes("page:gifts")} failed={!!error.gifts} onMore={()=>void next("gifts",meta.nextCursor)} render={g=><GiftRow gift={g} key={g.id}/>} /></div>
   </BenefitSection><BenefitSection title={L("rewards.history")}><div className="benefit-history-host"><RewardsHistory kind="redemptions"/></div></BenefitSection>
   {ui.giftIntent&&<GiftModal/>}</div>;
}
function QuotaRow({quota:q}:{quota:CSAQuota}){
 const {ui}=useNFV();
 const total=Math.max(0,Number(q.total)||0),remaining=Math.max(0,Number(q.remaining)||0),unit=ui.locale==="en"?(q.unitEn||q.unit||""):(q.unit||"");
 return <div className="csa-rights-row" role="row"><div className="csa-rights-product" role="cell"><strong>{localized(q as unknown as Record<string,unknown>,"productName",ui.locale)||q.name||"—"}</strong><small>{total} {unit} / {ui.locale==="en"?"cycle":"kỳ"}</small></div><div className="csa-rights-metric is-available" role="cell"><strong>{remaining}</strong><small className="mobile-only">{ui.locale==="en"?"Available":"Còn có thể đặt"}</small></div><div className="csa-rights-metric" role="cell"><strong>—</strong><small className="mobile-only">{ui.locale==="en"?"Ordering":"Đang đặt hàng"}</small></div><div className="csa-rights-metric" role="cell"><strong>—</strong><small className="mobile-only">{ui.locale==="en"?"Used":"Đã sử dụng"}</small></div></div>;
}
function CSABenefits({status}:{status?:"loading"|"ready"|"error"}){
 const {data,ui,setData,call,act,navigate,refreshResource}=useNFV();const c=data.csa;
 const [pageError,setPageError]=useState(false);
 const L=(key:string,vars?:Record<string,string|number>)=>copyText(ui.locale,key,vars);
 const purchaseLabel=!c?.planName?L("csa.explore"):c.status==="ended"||c.status==="revoked"?L("csa.registerAgain"):L("csa.managePurchase");
 const heading=<div className="csa-account-heading"><div><h2>{L("csa.title")}</h2><p>{L("navDesc.csa")}</p></div><ActionLink href={csaLandingHref(ui.locale,"packages")}>{purchaseLabel}</ActionLink></div>;
 if(!c?.planName)return <div className="benefits-page csa-benefits-page">{heading}<AccountCsaPendingStatus/>{status==="loading"?<section className="acc-section"><DataState kind="loading" title={L("state.loadingTitle")} description={L("state.loadingDesc")}/></section>:status==="error"?<section className="acc-section"><DataState kind="error" title={L("state.failedTitle")} description={L("state.failedDesc")} action={{label:L("common.retry"),onClick:()=>void refreshResource("csa")}}/></section>:<BenefitSection title={L("csa.noPackage")} description={L("csa.noPackageDesc")}><ActionLink variant="outline" href={csaLandingHref(ui.locale,"packages")}>{L("csa.explore")}</ActionLink></BenefitSection>}</div>;
 const quotas=c.quotas||[],usage=c.usage||c.history||[],contract=c.contract||{},page=c.pagination?.usage||{};
 const tone=({active:"active",upcoming:"pending",ended:"neutral",revoked:"error"} as Record<string,string>)[c.status]||"neutral";
 const loadMore=async()=>{if(!page.nextCursor)return;const result=await act("page:csa",()=>call<Paged<CSAUsage>>("getCsaUsagePage",{cursor:page.nextCursor,limit:30}));if(!result){setPageError(true);return;}const known=new Set(usage.map(item=>item.id));setData(state=>({...state,csa:state.csa?{...state.csa,usage:[...(state.csa.usage||[]),...result.items.filter(item=>!item.id||!known.has(item.id))],pagination:{...state.csa.pagination,usage:{nextCursor:result.nextCursor,total:result.total}}}:null}));setPageError(false);};
 return <div className="benefits-page csa-benefits-page">{heading}<AccountCsaPendingStatus/>
   <BenefitSection title={localized(c as unknown as Record<string,unknown>,"planName",ui.locale)||L("csa.current")}><div className="csa-plan-meta"><span><MetricBadge tone={tone}>{L("csa."+c.status)}</MetricBadge></span><span><span className="csa-meta-key">{L("csa.start")}</span><strong>{dateLabel(c.startDate)||"—"}</strong></span><span><span className="csa-meta-key">{L("csa.end")}</span><strong>{dateLabel(c.endDate)||"—"}</strong></span>{c.durationMonths&&<span><span className="csa-meta-key">{L("csa.duration")}</span><strong>{L("csa.monthCount",{count:c.durationMonths})}</strong></span>}</div><div className="csa-contract-inline"><div className="csa-contract-meta"><span className="csa-meta-key">{L("csa.contract")}</span><strong>{contract.number||L("csa.contractPending")}</strong>{contract.signedAt&&<span className="csa-contract-subtle">{L("csa.signed")} {dateLabel(contract.signedAt)}</span>}</div>{contract.downloadUrl?<ActionLink small variant="outline" className="csa-contract-action" href={contract.downloadUrl}><Icon name="file" size={14}/>{L("csa.viewContract")}</ActionLink>:<Button small variant="outline" className="csa-contract-action" disabled><Icon name="file" size={14}/>{L("csa.viewContract")}</Button>}</div>{quotas.length?<div className="csa-rights" role="table" aria-label={L("csa.quota")}><div className="csa-rights-header" role="row"><span role="columnheader">{ui.locale==="en"?"Produce group":"Nhóm nông sản"}</span><span role="columnheader">{ui.locale==="en"?"Available":"Còn có thể đặt"}</span><span role="columnheader">{ui.locale==="en"?"Ordering":"Đang đặt hàng"}</span><span role="columnheader">{ui.locale==="en"?"Used":"Đã sử dụng"}</span></div>{quotas.map((q,i)=><QuotaRow quota={q} key={i}/>)}</div>:<Empty title={L("csa.noQuota")}/>}</BenefitSection>
   <BenefitSection title={L("csa.usage")}><div className="benefit-history-host csa-history-footer"><PagedList kind="csa" items={usage} emptyTitle={L("csa.noUsage")} nextCursor={page.nextCursor} total={page.total} pending={ui.busyKeys.includes("page:csa")} failed={pageError} onMore={()=>void loadMore()} render={(u,i)=><BenefitTransactionRow key={u.id||i} title={localized(u as unknown as Record<string,unknown>,"productName",ui.locale)||u.productName||"—"} meta={dateLabel(u.date)} action={u.orderId?<button type="button" className="acc-text-link" onClick={()=>navigate("order-detail",{productId:u.orderId})}>{L("csa.viewOrder")} {u.orderId}<Icon name="chev" size={13}/></button>:undefined} amount={`−${u.quantity} ${ui.locale==="en"?(u.unitEn||u.unit||""):(u.unit||"")}`}/>}/></div></BenefitSection>
 </div>;
}
function ReferralBenefits(){
 const {data,ui,patch,call,act,setData,toast}=useNFV();const {next,error,pending}=useCursor();
 const ref=data.referrals||{},invites=ref.invitees||ref.history||[],person=ref.referrer;
 const L=(key:string,vars?:Record<string,string|number>)=>copyText(ui.locale,key,vars);
 const code=String(ref.code||"");const eligible=!!ref.canEnterReferrer&&!person;
 const inputValid=isReferralCode(ui.referrerDraft);
 const attach=async(e:FormEvent)=>{e.preventDefault();if(!inputValid||!eligible)return;
   let failureCode="";
   const result=await act("referral:apply",async()=>{
     try{return await call<Referrals>("applyReferralCode",{code:normalizeReferralCode(ui.referrerDraft)});}
     catch(error){failureCode=error instanceof Error?error.message:"";throw error;}
   });
   if(result?.referrer){setData(s=>({...s,referrals:mergeReferralSummary(s.referrals,result)}));patch({referrerDraft:"",referrerError:""});toast(L("ref.attachSuccess"));}
   else patch({referrerError:L(referralErrorCopyKey(failureCode))});
 };
 const copy=async()=>{
   if(!code)return;
   try {await copyTextToClipboard(code);toast(L("ref.copied"));}catch {toast(L("ref.copyFail"));}
 };
 const page=ref.pagination?.invitees||ref.pagination?.referrals||{};
 const count=Number.isFinite(Number(ref.invitedCount))?Number(ref.invitedCount):invites.length;
 return <div className="benefits-page referral-benefits-page">
   <section className="acc-section benefit-section referral-program-card" aria-label={L("ref.title")}>
     <div className="referral-personal-row"><h2 className="referral-part-title">{L("ref.personalCode")}</h2><div className="referral-part-body">{code?<div className="benefit-ref-code-line"><code id="referralPersonalCode">{code}</code><div className="benefit-code-actions"><Button small variant="outline" onClick={()=>void copy()}>{L("ref.copy")}</Button><ReferralShareDialog code={code} locale={ui.locale}/></div></div>:<p className="referral-muted-note">{L("ref.noCode")}</p>}</div></div>
     <section className="referral-earnings-row" aria-labelledby="referralEarningsTitle"><h2 id="referralEarningsTitle" className="referral-part-title">{L("ref.earningsTitle")}</h2><dl className="referral-earnings-list"><div><dt>{L("ref.successfulPoints")}</dt><dd>{L("ref.successfulLabel")}</dd></div><div><dt>{L("ref.secondOrderBonus")}</dt><dd>{L("ref.secondOrderLabel")}</dd></div></dl></section>
     <div className="referral-referrer-row"><h2 className="referral-part-title">{person?L("ref.attached"):L("ref.enterTitle")}</h2>
       <div className="referral-part-body">{person?<div className="referral-linked-details">{person.code&&<BenefitInfoRow title={L("ref.codeLabel")} value={person.code}/>} {person.name&&<BenefitInfoRow title={L("ref.attached")} value={person.name}/>} {person.linkedAt&&<BenefitInfoRow title={L("ref.dateLinked")} value={dateLabel(person.linkedAt)}/>}</div>:
       !eligible?<p className="referral-muted-note">{L("ref.notEligible")}</p>:
       <form className="benefit-ref-form" onSubmit={attach} id="referrerAttachForm"><div className="referral-code-entry"><input className="nfv-control" name="referrerCode" maxLength={10} autoComplete="off" placeholder={L("ref.enterPlaceholder")} aria-label={L("ref.enterPlaceholder")} value={ui.referrerDraft} onChange={e=>patch({referrerDraft:normalizeReferralCode(e.target.value).slice(0,10),referrerError:""})}/>
         <Button small type="submit" disabled={!inputValid} loading={ui.busyKeys.includes("referral:apply")}>{L("ref.attach")}</Button></div><div className="help-error" role="alert">{ui.referrerError}</div></form>}</div></div>
   </section>
   <BenefitSection title={L("ref.howTitle")} description={L("ref.howSubtitle")}><ol className="benefit-how referral-program-list referral-how-compact"><li><strong>{L("ref.howOneTitle")}</strong><span>{L("ref.howOneBody")}</span></li><li><strong>{L("ref.howTwoTitle")}</strong><span>{L("ref.howTwoBody")}</span></li><li><strong>{L("ref.howThreeTitle")}</strong><span>{L("ref.howThreeBody")}</span></li></ol></BenefitSection>
   <BenefitSection title={L("ref.terms")}><ul className="benefit-how referral-program-list referral-condition-list"><li>{L("ref.conditionOne")}</li><li>{L("ref.conditionTwo")}</li><li>{L("ref.conditionThree")}</li><li>{L("ref.conditionFour")}</li><li>{L("ref.conditionFive")}</li></ul></BenefitSection>
   <BenefitSection title={L("ref.listTitle")}><div className="referral-history-summary"><span>{L("ref.invitedCount")}</span><strong>{count.toLocaleString(ui.locale==="en"?"en-US":"vi-VN")}</strong></div>
     <div className="benefit-history-host"><PagedList kind="referrals" items={invites} emptyTitle={L("ref.noInvites")} nextCursor={page.nextCursor} total={page.total??count} pending={pending.includes("page:referrals")} failed={!!error.referrals} onMore={()=>void next("referrals",page.nextCursor)} render={invite=><InviteRow key={invite.id} invite={invite}/>}/></div>
   </BenefitSection>
 </div>;
}
function InviteRow({invite}:{invite:Invitee}){
 const {ui}=useNFV();const L=(key:string)=>copyText(ui.locale,key);
 const statuses:Record<string,[string,string]>={pending:["statusPending","pending"],recorded:["statusRecorded","done"],invalid:["statusInvalid","error"]};
 const [key,tone]=statuses[invite.status]||["statusPending","neutral"];
 const row=referralInvitePresentation(invite,dateLabel(invite.date));
 return <BenefitTransactionRow title={row.title} meta={row.meta} badge={<MetricBadge tone={tone}>{L("ref."+key)}</MetricBadge>}/>;
}
