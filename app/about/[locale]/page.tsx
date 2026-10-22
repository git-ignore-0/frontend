import {notFound} from "next/navigation";
import {NFVApp} from "../../NFVApp";
import type {Locale} from "@/types";
import type {Metadata} from "next";
import {ABOUT_COPY} from "@/data/about-content";
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale}=await params;
  if(locale!=="vi"&&locale!=="en")return {};
  const c=ABOUT_COPY[locale];
  return {title:`${c.metadataTitle} | Natural Farming Vietnam`,description:c.intro,
    alternates:{canonical:`/about/${locale}`,languages:{vi:"/about/vi",en:"/about/en"}}};
}
export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="vi"&&locale!=="en")notFound();
  return <NFVApp initialPage="about" initialLocale={locale as Locale}/>;
}
