import {parseStoreProductDetail,type StoreLocale,type StoreProductCard} from "./store-model";
import type {StoreProductSnapshot} from "./store-product-snapshots";

export type CartProductRefreshState="loading"|"error"|"unavailable";
export type CartProductNotice="price_changed"|"stock_changed"|undefined;

type RefreshInput={id:string;cached:StoreProductSnapshot;locale:StoreLocale};
type RefreshOptions={
  fetcher?:typeof fetch;
  onState:(id:string,state:CartProductRefreshState)=>void;
  onReady:(id:string,product:StoreProductCard,notice:CartProductNotice)=>void;
};

export async function verifyCartProduct(
  {id,cached,locale}:RefreshInput,
  {isCurrent,fetcher=fetch,signal}:{isCurrent:()=>boolean;fetcher?:typeof fetch;signal?:AbortSignal},
):Promise<StoreProductCard|"error"|"unavailable"|null>{
  const slugs=cached.catalogSlug&&cached.catalogSlug!==cached.slug?[cached.catalogSlug,cached.slug]:[cached.slug];
  let failed=false;
  for(const slug of slugs){
    try{
      const response=await fetcher(`/api/store/products/${encodeURIComponent(slug)}?locale=${locale}&retry=1`,{cache:"no-store",signal});
      if(!isCurrent())return null;
      if(response.status===404)continue;
      if(!response.ok)throw Error("refresh_failed");
      const product=parseStoreProductDetail(await response.json());
      if(!isCurrent())return null;
      if(product.id===id)return product;
    }catch(error){
      const aborted=signal&&!!error&&typeof error==="object"&&"name" in error&&error.name==="AbortError";
      if(!isCurrent()||aborted)return null;
      failed=true;
    }
  }
  return failed?"error":"unavailable";
}

export function createCartProductRefreshCoordinator({fetcher=fetch,onState,onReady}:RefreshOptions){
  type Request={locale:StoreLocale;cached:StoreProductSnapshot;controller:AbortController};
  const active=new Map<string,Request>();
  const current=(id:string,value:Request)=>active.get(id)===value;

  return {
    async refresh({id,cached,locale}:RefreshInput,{reusePending=false}={}){
      const pending=active.get(id);
      if(reusePending&&pending?.locale===locale
        &&pending.cached.slug===cached.slug
        &&pending.cached.catalogSlug===cached.catalogSlug
        &&pending.cached.retail_price_vnd===cached.retail_price_vnd
        &&pending.cached.available_quantity===cached.available_quantity)return;
      pending?.controller.abort();
      const request={locale,cached,controller:new AbortController()};
      active.set(id,request);
      onState(id,"loading");
      try{
        const result=await verifyCartProduct({id,cached,locale},{fetcher,signal:request.controller.signal,isCurrent:()=>current(id,request)});
        if(!result||!current(id,request))return;
        if(typeof result==="string"){
          onState(id,result);
          return;
        }
        const notice=cached.retail_price_vnd!==result.retail_price_vnd
          ? "price_changed"
          : cached.available_quantity!==result.available_quantity
            ? "stock_changed"
            : undefined;
        onReady(id,result,notice);
      }finally{
        if(current(id,request))active.delete(id);
      }
    },
    cancel(id:string){active.get(id)?.controller.abort();active.delete(id)},
    cancelAll(){for(const request of active.values())request.controller.abort();active.clear()},
  };
}
