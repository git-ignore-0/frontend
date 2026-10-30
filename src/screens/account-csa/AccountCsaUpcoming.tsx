"use client";

import {useState} from "react";
import {Button,Icon,Section} from "@/components/UI";
import {copyText} from "@/data/account-copy";
import {dateLabel} from "@/lib/format";
import {csaMoney} from "@/screens/csa/csa-packages-model";
import type {CSAUpcoming,Locale} from "@/types";

type PlanSummaryProps={planName:string;statusLabel:string;statusTone:"completed"|"processing";locale:Locale;durationMonths?:number;amount?:string;requestCode?:string;startDate?:string;endDate?:string};

export function AccountCsaPlanSummary({planName,statusLabel,statusTone,locale,durationMonths,amount,requestCode,startDate,endDate}:PlanSummaryProps){
  const L=(key:string,vars?:Record<string,string|number>)=>copyText(locale,key,vars);
  return <div className="csa-plan-summary">
    <div className="benefit-plan-title"><strong>{planName}</strong><span className={`acc-status ${statusTone}`}>{statusLabel}</span></div>
    <div className="csa-upcoming-meta">
      {durationMonths&&<span><span className="csa-meta-key">{L("csa.duration")}</span><strong>{L("csa.monthCount",{count:durationMonths})}</strong></span>}
      {amount&&<span><span className="csa-meta-key">{L("csa.packageTotal")}</span><strong>{csaMoney(amount,locale)}</strong></span>}
      {requestCode&&<span><span className="csa-meta-key">{L("csa.requestCode")}</span><strong>{requestCode}</strong></span>}
      {startDate&&<span><span className="csa-meta-key">{L("csa.start")}</span><strong>{dateLabel(startDate)}</strong></span>}
      {endDate&&<span><span className="csa-meta-key">{L("csa.end")}</span><strong>{dateLabel(endDate)}</strong></span>}
    </div>
  </div>;
}

function UpcomingItem({item,locale}:{item:CSAUpcoming;locale:Locale}){
  const L=(key:string)=>copyText(locale,key),scheduled=item.kind==="membership";
  const statusKey=scheduled?"csa.requestApproved":item.status==="payment_confirmed"?"csa.pendingTitle":"csa.requestPending";
  return <article className="csa-upcoming-item"><AccountCsaPlanSummary planName={item.planName} statusLabel={L(statusKey)} statusTone={scheduled?"completed":"processing"} locale={locale} durationMonths={item.durationMonths} amount={item.amount} requestCode={item.requestCode} startDate={item.startDate} endDate={item.endDate}/></article>;
}

export function AccountCsaUpcoming({items,locale}:{items:CSAUpcoming[];locale:Locale}){
  const [expanded,setExpanded]=useState(false),L=(key:string,vars?:Record<string,string|number>)=>copyText(locale,key,vars);
  if(!items.length)return null;
  if(items.length===1)return <Section title={L("csa.upcomingPlans")} className="benefit-section csa-upcoming-section is-single"><UpcomingItem item={items[0]} locale={locale}/></Section>;
  const contentId="csa-upcoming-list";
  return <Section title={L("csa.upcomingPlans")} description={L("csa.upcomingCount",{count:items.length})} className={`benefit-section csa-upcoming-section ${expanded?"is-expanded":"is-collapsed"}`} actions={<Button small variant="outline" aria-expanded={expanded} aria-controls={contentId} onClick={()=>setExpanded(value=>!value)}>{L(expanded?"csa.hideUpcoming":"csa.showUpcoming")}<Icon name="chev" size={14}/></Button>}>
    {expanded&&<div id={contentId} className="csa-upcoming-list">{items.map(item=><UpcomingItem key={`${item.kind}:${item.id}`} item={item} locale={locale}/>)}</div>}
  </Section>;
}
