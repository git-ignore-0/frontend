import type {Metadata} from "next";
import {notFound,redirect} from "next/navigation";
import {siteAuthHref} from "@/auth/site-auth";
import type {Locale} from "@/types";

export const metadata:Metadata={robots:{index:false,follow:false}};

/** Compatibility only: this app does not render authentication forms. */
export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="vi"&&locale!=="en")notFound();
  redirect(siteAuthHref("register",locale as Locale));
}
