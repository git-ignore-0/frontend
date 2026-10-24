import {notFound} from "next/navigation";
import {NFVApp} from "../../NFVApp";
import type {Locale} from "@/types";
import type {Metadata} from "next";
import {publicPageMetadata} from "@/lib/public-metadata";
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale}=await params;
  if(locale!=="vi"&&locale!=="en")return {};
  return publicPageMetadata("about",locale);
}
export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="vi"&&locale!=="en")notFound();
  return <NFVApp initialPage="about" initialLocale={locale as Locale}/>;
}
