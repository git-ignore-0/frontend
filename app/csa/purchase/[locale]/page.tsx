import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {NFVApp} from "../../../NFVApp";
import {CsaPurchasePage} from "@/screens/csa/CsaPurchasePage";
import {csaFlowMetadata} from "@/lib/public-metadata";
import type {Locale} from "@/types";

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const {locale}=await params;return locale==="vi"||locale==="en"?csaFlowMetadata("purchase",locale):{};}
export default async function Page({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{package?:string|string[];page?:string|string[]}>}){const {locale}=await params;if(locale!=="vi"&&locale!=="en")notFound();const query=await searchParams,raw=query.package,rawPage=query.page,initialPackageId=typeof raw==="string"&&raw.length<=128?raw:undefined,parsedPage=typeof rawPage==="string"?Number(rawPage):NaN,initialPackagePage=Number.isSafeInteger(parsedPage)&&parsedPage>0&&parsedPage<=10000?parsedPage:1;return <NFVApp initialPage="csa" initialLocale={locale as Locale}><CsaPurchasePage locale={locale as Locale} initialPackageId={initialPackageId} initialPackagePage={initialPackagePage}/></NFVApp>;}
