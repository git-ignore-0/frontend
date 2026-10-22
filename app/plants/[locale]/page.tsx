import {notFound} from "next/navigation";
import type {Metadata} from "next";
import type {Locale} from "@/types";
import {NFVApp} from "../../NFVApp";
import {PLANTS_COPY} from "@/data/knowledge-content";
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale}=await params;
  if(locale!=="vi"&&locale!=="en")return {};
  const copy=PLANTS_COPY[locale];
  return {title:`${copy.label} | Natural Farming Vietnam`,description:copy.intro,
    alternates:{canonical:`/plants/${locale}`,languages:{vi:"/plants/vi",en:"/plants/en"}}};
}
export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="vi"&&locale!=="en")notFound();
  return <NFVApp initialPage="plants" initialLocale={locale as Locale}/>;
}
