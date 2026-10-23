import {notFound} from "next/navigation";
import {NFVApp} from "../../NFVApp";
import type {Locale} from "@/types";
import type {Metadata} from "next";
import {WORKSHOP_COPY} from "@/data/workshop-copy";

export async function generateMetadata({params}:{params:Promise<{segment:string}>}):Promise<Metadata>{
  const {segment}=await params;
  if(segment!=="vi"&&segment!=="en")return {};
  const c=WORKSHOP_COPY[segment];
  return {title:`${c.title} | Natural Farming Vietnam`,description:c.intro,
    alternates:{canonical:`/workshops/${segment}`,languages:{vi:"/workshops/vi",en:"/workshops/en"}}};
}
export default async function Page({params}:{params:Promise<{segment:string}>}){
  const {segment}=await params;
  if(segment!=="vi"&&segment!=="en")notFound();
  return <NFVApp initialPage="workshops" initialLocale={segment as Locale}/>;
}
