import {notFound} from "next/navigation";
import {NFVApp} from "../../NFVApp";
import type {Locale} from "@/types";

export default async function Page({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="vi"&&locale!=="en")notFound();
  return <NFVApp initialPage="store" initialLocale={locale as Locale}/>;
}
