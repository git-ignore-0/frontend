import type {Locale,Screen} from "@/types";

const HIDDEN_PAGES:ReadonlySet<Screen>=new Set(["account","checkout","order-detail","success"]);

export function referralFloatingActionModel(locale:Locale):{href:string;label:string}{
  return {
    href:`/account/${locale}?tab=referrals`,
    label:locale==="en"?"Refer friends":"Giới thiệu bạn bè",
  };
}

export function shouldShowReferralFloatingAction({page,overlayOpen}:{page:Screen;overlayOpen:boolean}):boolean{
  return !overlayOpen&&!HIDDEN_PAGES.has(page);
}
