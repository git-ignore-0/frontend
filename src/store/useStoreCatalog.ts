"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {usePathname,useRouter,useSearchParams} from "next/navigation";
import type {Locale} from "@/types";
import {parseStoreCategories,parseStorePage,type StoreCategory,type StorePage,type StoreProductCard} from "./store-model";
import {DEFAULT_STORE_PAGE_SIZE,parseStoreUrlState,storePublicSearchParams,storeQueryParams,storeRetrySuffix,type StorePriceBand,type StoreQuery} from "./store-request";

type State="loading"|"ready"|"error";
type ProductContext={key:string;query:StoreQuery;group:{key:string}};
export function useStoreCatalog(locale:Locale){
 const router=useRouter(),pathname=usePathname(),searchParams=useSearchParams();
 const parsed=useMemo(()=>{const params=new URLSearchParams(searchParams.toString());params.delete("page");return parseStoreUrlState(params,locale)},[locale,searchParams]);
 const canonical=parsed.canonical.toString();
 const [categoryResult,setCategoryResult]=useState<{key:string;state:State;data:StoreCategory[]}>({key:"",state:"loading",data:[]}),[categoryRetry,setCategoryRetry]=useState({key:"",nonce:0});
 const [productResult,setProductResult]=useState<{key:ProductContext|null;state:State;page:StorePage;batch:StoreProductCard[]}>({key:null,state:"loading",batch:[],page:{data:[],meta:{page:1,page_size:DEFAULT_STORE_PAGE_SIZE,total:0}}}),[productRetry,setProductRetry]=useState({key:"",nonce:0});
 const categoryBaseKey=locale,categoryRetryNonce=categoryRetry.key===categoryBaseKey?categoryRetry.nonce:0;
 const productBaseKey=storeQueryParams(parsed.query).toString(),productRetryNonce=productRetry.key===productBaseKey?productRetry.nonce:0;
 const categoryRequestKey=`${categoryBaseKey}:${categoryRetryNonce}`;
 const productRequestKey=`${productBaseKey}:${productRetryNonce}`;
 // Sorting shares visible results; leaving these filters permanently invalidates that group.
 const groupKey=storeQueryParams({...parsed.query,sort:"default"}).toString();
 const productGroup=useMemo(()=>({key:groupKey}),[groupKey]);
 // A new context belongs to each request cycle, even when returning to the same URL.
 const productContext=useMemo<ProductContext>(()=>({key:productRequestKey,query:parsed.query,group:productGroup}),[parsed.query,productRequestKey,productGroup]);
 const currentProductKey=useRef<ProductContext|null>(null);
 const [productFailure,setProductFailure]=useState<ProductContext|null>(null);
 const moreRequest=useRef<AbortController|null>(null);
 const [moreState,setMoreState]=useState<{key:ProductContext|null;state:State}>({key:null,state:"ready"});
 useEffect(()=>{if(searchParams.toString()!==canonical)router.replace(`${pathname}${canonical?`?${canonical}`:""}`,{scroll:false})},[canonical,pathname,router,searchParams]);
 useEffect(()=>{const controller=new AbortController();fetch(`/api/store/categories?locale=${locale}${storeRetrySuffix(categoryRetryNonce)}`,{cache:"no-store",signal:controller.signal}).then(async response=>{if(!response.ok)throw Error("categories_failed");return response.json()}).then(body=>setCategoryResult({key:categoryRequestKey,state:"ready",data:parseStoreCategories(body)})).catch(error=>{if(error?.name!=="AbortError")setCategoryResult(result=>({...result,key:categoryRequestKey,state:"error"}))});return()=>controller.abort()},[categoryRequestKey,categoryRetryNonce,locale]);
 useEffect(()=>{const controller=new AbortController();moreRequest.current?.abort();moreRequest.current=null;currentProductKey.current=productContext;const params=storeQueryParams(parsed.query);if(productRetryNonce>0)params.set("retry",String(productRetryNonce));fetch(`/api/store/products?${params}`,{cache:"no-store",signal:controller.signal}).then(async response=>{if(!response.ok)throw Error("products_failed");return response.json()}).then(body=>{if(!controller.signal.aborted&&currentProductKey.current===productContext){const page=parseStorePage(body);setProductResult({key:productContext,state:"ready",page,batch:page.data});setMoreState({key:productContext,state:"ready"});}}).catch(error=>{if(!controller.signal.aborted&&error?.name!=="AbortError"&&currentProductKey.current===productContext)setProductFailure(productContext)});return()=>{controller.abort();moreRequest.current?.abort();moreRequest.current=null;currentProductKey.current=null}},[parsed.query,productContext,productRetryNonce]);
 const setQuery=useCallback((change:Partial<StoreQuery>&{priceBand?:StorePriceBand},options?:{replace?:boolean})=>{const band=change.priceBand??parsed.priceBand;const query={...parsed.query,...change,page:change.page??1};delete (query as Partial<StoreQuery>&{priceBand?:StorePriceBand}).priceBand;const next=storePublicSearchParams(query,band).toString();(options?.replace?router.replace:router.push)(`${pathname}${next?`?${next}`:""}`,{scroll:false})},[parsed,pathname,router]);
 const categoryState:State=categoryResult.key===categoryRequestKey?categoryResult.state:"loading";
 const state:State=productResult.key===productContext?productResult.state:productFailure===productContext?"error":"loading";
 // Keep a previous result only when the requested change is its sort order.
 const keepProducts=productResult.page.data.length>0&&productResult.state==="ready"&&productResult.key!==null&&productResult.key!==productContext&&productResult.key.group===productGroup;
 const hasMore=state==="ready"&&productResult.page.data.length>0&&productResult.page.meta.page*productResult.page.meta.page_size<productResult.page.meta.total;
 const loadMore=useCallback(async()=>{
  if(currentProductKey.current!==productContext||productResult.key!==productContext||productResult.state!=="ready"||!hasMore||moreRequest.current)return;
  const controller=new AbortController(),key=productContext;
  moreRequest.current=controller;setMoreState({key,state:"loading"});
  const params=storeQueryParams({...parsed.query,page:productResult.page.meta.page+1});
  // Only an explicit retry bypasses the server cache.
  if(moreState.key===key&&moreState.state==="error")params.set("retry","1");
  try{
   const response=await fetch(`/api/store/products?${params}`,{cache:"no-store",signal:controller.signal});
   if(!response.ok)throw Error("products_failed");
   const page=parseStorePage(await response.json());
   if(controller.signal.aborted||currentProductKey.current!==key)return;
   setProductResult(previous=>{
    if(previous.key!==key)return previous;
    const ids=new Set(previous.page.data.map(product=>product.id));
    const batch=page.data.filter(product=>!ids.has(product.id));
    return {...previous,batch,page:{data:[...previous.page.data,...batch],meta:page.meta}};
   });
   setMoreState({key,state:"ready"});
  }catch{if(!controller.signal.aborted&&currentProductKey.current===key)setMoreState({key,state:"error"});}
  finally{if(moreRequest.current===controller)moreRequest.current=null;}
 },[hasMore,moreState,parsed.query,productContext,productResult]);
 const loadingMore=moreState.key===productContext&&moreState.state==="loading";
 const moreError=moreState.key===productContext&&moreState.state==="error";
 const nextRetry=(value:number)=>value>=10_000?1:value+1;
 return {keepProducts,batch:productResult.batch,hasMore,loadingMore,moreError,loadMore,categories:categoryResult.data,products:productResult.page.data,meta:productResult.page.meta,query:parsed.query,priceBand:parsed.priceBand,state,categoryState,setQuery,retryProducts:()=>setProductRetry(value=>({key:productBaseKey,nonce:value.key===productBaseKey?nextRetry(value.nonce):1})),retryCategories:()=>setCategoryRetry(value=>({key:categoryBaseKey,nonce:value.key===categoryBaseKey?nextRetry(value.nonce):1}))};
}
