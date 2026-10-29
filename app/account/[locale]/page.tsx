import type {Metadata} from "next";
import {notFound,redirect} from "next/navigation";
import {NFVApp} from "../../NFVApp";
import type {AccountTab,Locale} from "@/types";
import {isReferralCode,normalizeReferralCode} from "@/account/referral-presentation";
import {csaTrackerHref} from "@/lib/csa-navigation";

const ACCOUNT_TABS:readonly AccountTab[]=["orders","address","profile","csa","csa-tracker","rewards","redeem","referrals"];
export const metadata:Metadata={robots:{index:false,follow:false}};

export default async function Page({params,searchParams}:{params:Promise<{locale:string}>;searchParams?:Promise<{tab?:string|string[];ref?:string|string[]}>}){
  const {locale}=await params;
  if(locale!=="vi"&&locale!=="en")notFound();
  const query=await searchParams;
  const requested=query?.tab;
  if(requested==="csa-tracker")redirect(csaTrackerHref(locale as Locale));
  const hasRequestedTab=typeof requested==="string"&&ACCOUNT_TABS.includes(requested as AccountTab);
  const initialAccountTab=hasRequestedTab?requested as AccountTab:"orders";
  const referralCode=typeof query?.ref==="string"?normalizeReferralCode(query.ref):"";
  return <NFVApp initialPage="account" initialLocale={locale as Locale} initialAccountTab={initialAccountTab} initialAccountHubOpen={!hasRequestedTab} initialReferrerCode={isReferralCode(referralCode)?referralCode:""}/>;
}
