import {notFound} from "next/navigation";
import {NFVApp} from "../../NFVApp";
import type {Locale} from "@/types";
import type {Metadata} from "next";
import {WORKSHOP_COPY} from "@/data/workshop-copy";
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale}=await params;
  if(locale!=="vi"&&locale!=="en")return {};
  const c=WORKSHOP_COPY[locale];
  return {title:`${c.title} | Natural Farming Vietnam`,description:c.intro,
    alternates:{canonical:`/workshops/${locale}`,languages:{vi:"/workshops/vi",en:"/workshops/en"}}};
}
export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="vi"&&locale!=="en")notFound();
  return <NFVApp initialPage="workshops" initialLocale={locale as Locale}/>;
}
