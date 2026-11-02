import {notFound} from "next/navigation";
import {NFVApp} from "../../../NFVApp";
import type {Locale} from "@/types";
export const metadata={robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(locale!=="vi"&&locale!=="en")notFound();return <NFVApp initialPage="checkout" initialLocale={locale as Locale}/>}
