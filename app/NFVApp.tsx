import type {ReactNode} from "react";
import type {AccountTab,Locale,Screen} from "@/types";
import {getPublicSiteSettings} from "@/lib/site-settings-server";
import {NFVClientApp} from "./NFVClientApp";

type NFVAppProps={
  initialPage?:Screen;
  initialLocale?:Locale;
  initialAccountTab?:AccountTab;
  initialAccountHubOpen?:boolean;
  initialReferrerCode?:string;
  children?:ReactNode;
};

/** Server boundary seeds the shared client cache and keeps Organization JSON-LD complete in initial HTML. */
export async function NFVApp({initialPage="home",initialLocale="vi",initialAccountTab="orders",initialAccountHubOpen=true,initialReferrerCode="",children}:NFVAppProps){
  const settings=await getPublicSiteSettings(initialLocale);
  return <NFVClientApp initialPage={initialPage} initialLocale={initialLocale} initialAccountTab={initialAccountTab} initialAccountHubOpen={initialAccountHubOpen} initialReferrerCode={initialReferrerCode} initialSiteSettings={settings}>{children}</NFVClientApp>;
}
