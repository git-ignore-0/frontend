"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {usePathname,useRouter,useSearchParams} from "next/navigation";
import type {Locale} from "@/types";
import {parseStoreCategories,parseStorePage,type StoreCategory,type StorePage} from "./store-model";
import {parseStoreUrlState,storePublicSearchParams,storeQueryParams,storeRetrySuffix,type StorePriceBand,type StoreQuery} from "./store-request";

type State="loading"|"ready"|"error";
export function useStoreCatalog(locale:Locale){
 const router=useRouter(),pathname=usePathname(),searchParams=useSearchParams();
 const parsed=useMemo(()=>parseStoreUrlState(new URLSearchParams(searchParams.toString()),locale),[locale,searchParams]);
 const canonical=parsed.canonical.toString();
 const [categoryResult,setCategoryResult]=useState<{key:string;state:State;data:StoreCategory[]}>({key:"",state:"loading",data:[]}),[categoryRetry,setCategoryRetry]=useState({key:"",nonce:0});
 const [productResult,setProductResult]=useState<{key:string;state:State;page:StorePage}>({key:"",state:"loading",page:{data:[],meta:{page:1,page_size:12,total:0}}}),[productRetry,setProductRetry]=useState({key:"",nonce:0});
 const categoryBaseKey=locale,categoryRetryNonce=categoryRetry.key===categoryBaseKey?categoryRetry.nonce:0;
 const productBaseKey=storeQueryParams(parsed.query).toString(),productRetryNonce=productRetry.key===productBaseKey?productRetry.nonce:0;
 const categoryRequestKey=`${categoryBaseKey}:${categoryRetryNonce}`;
 const productRequestKey=`${productBaseKey}:${productRetryNonce}`;
 const currentProductKey=useRef("");
 useEffect(()=>{if(searchParams.toString()!==canonical)router.replace(`${pathname}${canonical?`?${canonical}`:""}`,{scroll:false})},[canonical,pathname,router,searchParams]);
 useEffect(()=>{const controller=new AbortController();fetch(`/api/store/categories?locale=${locale}${storeRetrySuffix(categoryRetryNonce)}`,{cache:"no-store",signal:controller.signal}).then(async response=>{if(!response.ok)throw Error("categories_failed");return response.json()}).then(body=>setCategoryResult({key:categoryRequestKey,state:"ready",data:parseStoreCategories(body)})).catch(error=>{if(error?.name!=="AbortError")setCategoryResult(result=>({...result,key:categoryRequestKey,state:"error"}))});return()=>controller.abort()},[categoryRequestKey,categoryRetryNonce,locale]);
 useEffect(()=>{const controller=new AbortController();currentProductKey.current=productRequestKey;const params=storeQueryParams(parsed.query);if(productRetryNonce>0)params.set("retry",String(productRetryNonce));fetch(`/api/store/products?${params}`,{cache:"no-store",signal:controller.signal}).then(async response=>{if(!response.ok)throw Error("products_failed");return response.json()}).then(body=>{if(currentProductKey.current===productRequestKey)setProductResult({key:productRequestKey,state:"ready",page:parseStorePage(body)})}).catch(error=>{if(error?.name!=="AbortError"&&currentProductKey.current===productRequestKey)setProductResult(result=>({...result,key:productRequestKey,state:"error"}))});return()=>controller.abort()},[parsed.query,productRequestKey,productRetryNonce]);
 const setQuery=useCallback((change:Partial<StoreQuery>&{priceBand?:StorePriceBand},options?:{replace?:boolean})=>{const band=change.priceBand??parsed.priceBand;const query={...parsed.query,...change,page:change.page??1};delete (query as Partial<StoreQuery>&{priceBand?:StorePriceBand}).priceBand;const next=storePublicSearchParams(query,band).toString();(options?.replace?router.replace:router.push)(`${pathname}${next?`?${next}`:""}`,{scroll:false})},[parsed,pathname,router]);
 const categoryState:State=categoryResult.key===categoryRequestKey?categoryResult.state:"loading";
 const state:State=productResult.key===productRequestKey?productResult.state:"loading";
 const nextRetry=(value:number)=>value>=10_000?1:value+1;
 return {categories:categoryResult.data,products:productResult.page.data,meta:productResult.page.meta,query:parsed.query,priceBand:parsed.priceBand,state,categoryState,setQuery,retryProducts:()=>setProductRetry(value=>({key:productBaseKey,nonce:value.key===productBaseKey?nextRetry(value.nonce):1})),retryCategories:()=>setCategoryRetry(value=>({key:categoryBaseKey,nonce:value.key===categoryBaseKey?nextRetry(value.nonce):1}))};
}
