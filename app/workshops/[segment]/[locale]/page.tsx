import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {NFVApp} from "../../../NFVApp";
import {WorkshopDetail} from "@/screens/workshops/WorkshopDetail";
import {getPublicWorkshop} from "@/lib/workshop-server";
import type {Locale} from "@/types";

function validLocale(value:string):value is Locale{return value==="vi"||value==="en"}
export async function generateMetadata({params}:{params:Promise<{segment:string;locale:string}>}):Promise<Metadata>{
  const {segment,locale}=await params;if(!validLocale(locale))return {};
  const workshop=await getPublicWorkshop(segment,locale);if(!workshop)return {};
  const canonicalLocale=workshop.content_locale||locale;
  return {title:`${workshop.title} | Natural Farming Vietnam`,description:workshop.summary,
    robots:workshop.is_fallback?{index:false,follow:true}:undefined,
    alternates:{canonical:`/workshops/${encodeURIComponent(workshop.slug)}/${canonicalLocale}`,
      languages:Object.fromEntries((workshop.available_locales||[canonicalLocale]).map(item=>[item,`/workshops/${encodeURIComponent(workshop.slug)}/${item}`]))},
    openGraph:{title:workshop.title,description:workshop.summary,type:"article"}};
}
export default async function Page({params}:{params:Promise<{segment:string;locale:string}>}){
  const {segment,locale}=await params;if(!validLocale(locale))notFound();
  const workshop=await getPublicWorkshop(segment,locale);if(!workshop)notFound();
  return <NFVApp initialPage="workshops" initialLocale={locale}><WorkshopDetail workshop={workshop} locale={locale}/></NFVApp>;
}
