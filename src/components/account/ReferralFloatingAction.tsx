import {Icon} from "@/components/UI";
import {referralFloatingActionModel} from "./referral-floating-action-model";
import type {Locale} from "@/types";

export function ReferralFloatingAction({locale}:{locale:Locale}){
  const {href,label}=referralFloatingActionModel(locale);
  return <a className="referral-floating-action" href={href} aria-label={label}>
    <span className="referral-floating-action-icon" aria-hidden="true"><Icon name="gift" size={18}/></span>
    <span className="referral-floating-action-label">{label}</span>
  </a>;
}
