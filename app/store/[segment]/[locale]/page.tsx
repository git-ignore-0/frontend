import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {NFVApp} from "../../../NFVApp";
import {parseRetryCacheBypass} from "@/lib/public-request";
import {storeProductMetadata} from "@/lib/public-metadata";
import {ProductDetail} from "@/screens/store/ProductDetail";
import {fetchStoreProduct,StoreUpstreamError} from "@/store/store-service";
import type {StoreLocale} from "@/store/store-model";

type RouteProps={params:Promise<{segment:string;locale:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
const SLUG=/^[a-z0-9_-]+$/i;
function validLocale(value:string):value is StoreLocale{return value==="vi"||value==="en"}
function validSlug(value:string){return value.length<=180&&SLUG.test(value)}
function retryState(value:Record<string,string|string[]|undefined>){const params=new URLSearchParams();for(const [key,item] of Object.entries(value)){if(typeof item==="string")params.append(key,item);else item?.forEach(entry=>params.append(key,entry))}if([...params.keys()].some(key=>key!=="retry")||params.getAll("retry").length>1)return null;return parseRetryCacheBypass(params)}
async function loadProduct(slug:string,locale:StoreLocale,bypassCache:boolean){try{return (await fetchStoreProduct(slug,locale,{bypassCache})).data}catch(error){if(error instanceof StoreUpstreamError&&error.status===404)notFound();throw error}}

export async function generateMetadata({params,searchParams}:RouteProps):Promise<Metadata>{
 const {segment:slug,locale}=await params;if(!validLocale(locale)||!validSlug(slug))return {};
 const retry=retryState(await searchParams);if(retry===null)return {};
 try{return storeProductMetadata(await loadProduct(slug,locale,retry),locale)}catch{return {}}
}

export default async function Page({params,searchParams}:RouteProps){
 const {segment:slug,locale}=await params;if(!validLocale(locale)||!validSlug(slug))notFound();
 const retry=retryState(await searchParams);if(retry===null)notFound();
 const product=await loadProduct(slug,locale,retry);
 return <NFVApp initialPage="store" initialLocale={locale}><ProductDetail product={product} locale={locale}/></NFVApp>;
}
