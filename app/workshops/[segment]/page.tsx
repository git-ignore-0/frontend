import {notFound} from "next/navigation";
import {NFVApp} from "../../NFVApp";
import type {Locale} from "@/types";
import type {Metadata} from "next";
import {publicPageMetadata} from "@/lib/public-metadata";

export async function generateMetadata({params}:{params:Promise<{segment:string}>}):Promise<Metadata>{
  const {segment}=await params;
  if(segment!=="vi"&&segment!=="en")return {};
  return publicPageMetadata("workshops",segment);
}
export default async function Page({params}:{params:Promise<{segment:string}>}){
  const {segment}=await params;
  if(segment!=="vi"&&segment!=="en")notFound();
  return <NFVApp initialPage="workshops" initialLocale={segment as Locale}/>;
}
