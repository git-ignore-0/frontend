import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {NFVApp} from "../../../NFVApp";
import {WorkshopDetail} from "@/screens/workshops/WorkshopDetail";
import {getPublicWorkshop} from "@/lib/workshop-server";
import {workshopPageMetadata} from "@/lib/public-metadata";
import type {Locale} from "@/types";

function validLocale(value:string):value is Locale{return value==="vi"||value==="en"}
export async function generateMetadata({params}:{params:Promise<{segment:string;locale:string}>}):Promise<Metadata>{
  const {segment,locale}=await params;if(!validLocale(locale))return {};
  const workshop=await getPublicWorkshop(segment,locale);if(!workshop)return {};
  return workshopPageMetadata(workshop,locale);
}
export default async function Page({params}:{params:Promise<{segment:string;locale:string}>}){
  const {segment,locale}=await params;if(!validLocale(locale))notFound();
  const workshop=await getPublicWorkshop(segment,locale);if(!workshop)notFound();
  return <NFVApp initialPage="workshops" initialLocale={locale}><WorkshopDetail workshop={workshop} locale={locale}/></NFVApp>;
}
