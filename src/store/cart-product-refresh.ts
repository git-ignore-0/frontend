import {parseStoreProductDetail,type StoreLocale,type StoreProductCard} from "./store-model";

export type CartProductRefreshState="loading"|"error"|"unavailable";
export type CartProductNotice="price_changed"|"stock_changed"|undefined;

type RefreshInput={id:string;cached:StoreProductCard;locale:StoreLocale};
type RefreshOptions={
  fetcher?:typeof fetch;
  onState:(id:string,state:CartProductRefreshState)=>void;
  onReady:(id:string,product:StoreProductCard,notice:CartProductNotice)=>void;
};

export function createCartProductRefreshCoordinator({fetcher=fetch,onState,onReady}:RefreshOptions){
  const active=new Map<string,{sequence:number;controller:AbortController}>();
  let sequence=0;
  const current=(id:string,value:{sequence:number;controller:AbortController})=>active.get(id)===value;

  return {
    async refresh({id,cached,locale}:RefreshInput){
      active.get(id)?.controller.abort();
      const request={sequence:++sequence,controller:new AbortController()};
      active.set(id,request);
      onState(id,"loading");
      try{
        const response=await fetcher(`/api/store/products/${encodeURIComponent(cached.slug)}?locale=${locale}&retry=1`,{cache:"no-store",signal:request.controller.signal});
        if(!current(id,request))return;
        if(response.status===404){onState(id,"unavailable");return}
        if(!response.ok)throw Error("refresh_failed");
        const product=parseStoreProductDetail(await response.json());
        if(!current(id,request))return;
        const notice=cached.retail_price_vnd!==product.retail_price_vnd
          ? "price_changed"
          : cached.available_quantity!==product.available_quantity
            ? "stock_changed"
            : undefined;
        onReady(id,product,notice);
      }catch(error){
        const aborted=!!error&&typeof error==="object"&&"name" in error&&error.name==="AbortError";
        if(current(id,request)&&!aborted)onState(id,"error");
      }finally{
        if(current(id,request))active.delete(id);
      }
    },
    cancel(id:string){active.get(id)?.controller.abort();active.delete(id)},
    cancelAll(){for(const request of active.values())request.controller.abort();active.clear()},
  };
}
