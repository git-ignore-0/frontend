"use client";
import {useEffect,type ReactNode} from "react";
import {NFVProvider,useNFV} from "@/state/NFVContext";
import {AuthProvider,useAuth} from "@/auth/AuthProvider";
import {AuthGate} from "@/components/auth/AuthGate";
import type {AccountTab,Locale,Screen} from "@/types";
import type {PublicSiteSettings} from "@/types/site-settings";
import {Header} from "@/components/navigation/SiteHeader";
import {SiteFooter} from "@/components/layout/SiteFooter";
import {HomePage} from "@/screens/home/HomePage";
import {AboutPage} from "@/screens/about/AboutPage";
import {WorkshopsPage} from "@/screens/workshops/WorkshopsPage";
import {PlantsPage} from "@/screens/plants/PlantsPage";
import {AnimalsPage} from "@/screens/animals/AnimalsPage";
import {TrackerPage} from "@/screens/tracker/TrackerPage";
import {TestimonialsPage} from "@/screens/testimonials/TestimonialsPage";
import {StoriesWidget} from "@/components/testimonials/StoriesWidget";
import {Store} from "@/screens/Store";
import {CSAProgram} from "@/screens/CSAProgram";
import {CartDrawer,Checkout} from "@/screens/Checkout";
import {Account} from "@/screens/Account";
import {OrderDetail} from "@/screens/AccountOrders";
import {Toast} from "@/components/Toast";
import {ReferralFloatingAction} from "@/components/account/ReferralFloatingAction";
import {shouldShowReferralFloatingAction} from "@/components/account/referral-floating-action-model";
import {SiteSettingsProvider} from "@/context/SiteSettingsContext";

/** Show public storytelling only on editorial pages. Keep checkout/account free of floating overlays. */
const PUBLIC_STORY_PAGES = new Set<Screen>(["home","about","plants","animals","tracker"]);
function Body({children,initialPage}:{children?:ReactNode;initialPage:Screen}){
 const {ui,patch}=useNFV();
 const auth=useAuth();
 const overlayOpen=ui.addressEditing||ui.orderDateOpen||ui.giftIntent!==null;
 const showReferralAction=shouldShowReferralFloatingAction({page:ui.page,overlayOpen,authenticated:auth.status==="authenticated"});
 useEffect(()=>{
   const close=(e:KeyboardEvent)=>{if(e.key==="Escape"&&ui.orderDateOpen)patch({orderDateOpen:false});};
   window.addEventListener("keydown",close);return ()=>window.removeEventListener("keydown",close);
 },[patch,ui.orderDateOpen]);
 return <div className={`nfv-app${ui.page==="account"||ui.page==="order-detail"?" nfv-app--auth-route":""}`}><Header/>
   <CartDrawer/>
   {children&&ui.page===initialPage?children:(ui.page==="home"?<HomePage/>:ui.page==="about"?<AboutPage/>:ui.page==="workshops"?<WorkshopsPage/>:ui.page==="plants"?<PlantsPage/>:ui.page==="animals"?<AnimalsPage/>:ui.page==="tracker"?<TrackerPage/>:ui.page==="testimonials"?<TestimonialsPage key={ui.locale}/>:ui.page==="store"?<Store/>:ui.page==="checkout"?<Checkout/>:ui.page==="account"?<Account/>:ui.page==="csa"?<CSAProgram/>:ui.page==="order-detail"?<AuthGate><OrderDetail/></AuthGate>:<Store/>)}
   <SiteFooter/>
   {!children&&PUBLIC_STORY_PAGES.has(ui.page)&&<StoriesWidget key={ui.locale}/>} 
   {showReferralAction&&<ReferralFloatingAction locale={ui.locale}/>} 
   <Toast message={ui.toast} tone={ui.toastTone} sequence={ui.toastSequence}/>
 </div>;
}

type NFVClientAppProps={
  initialPage?:Screen;
  initialLocale?:Locale;
  initialAccountTab?:AccountTab;
  initialAccountHubOpen?:boolean;
  initialReferrerCode?:string;
  initialSiteSettings?:PublicSiteSettings|null;
  children?:ReactNode;
};

export function NFVClientApp({initialPage="home",initialLocale="vi",initialAccountTab="orders",initialAccountHubOpen=true,initialReferrerCode="",initialSiteSettings=null,children}:NFVClientAppProps){
  return <SiteSettingsProvider locale={initialLocale} settings={initialSiteSettings}><AuthProvider><NFVProvider initialPage={initialPage} initialLocale={initialLocale} initialAccountTab={initialAccountTab} initialAccountHubOpen={initialAccountHubOpen} initialReferrerCode={initialReferrerCode}><Body initialPage={initialPage}>{children}</Body></NFVProvider></AuthProvider></SiteSettingsProvider>;
}
