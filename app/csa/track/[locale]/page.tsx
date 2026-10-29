import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {NFVApp} from "../../../NFVApp";
import {CsaTrackerPublicPage} from "@/screens/csa/CsaTrackerPublicPage";
import {csaFlowMetadata} from "@/lib/public-metadata";
import type {Locale} from "@/types";

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const {locale}=await params;return locale==="vi"||locale==="en"?csaFlowMetadata("track",locale):{};}
export default async function Page({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(locale!=="vi"&&locale!=="en")notFound();return <NFVApp initialPage="csa" initialLocale={locale as Locale}><CsaTrackerPublicPage locale={locale as Locale}/></NFVApp>;}
