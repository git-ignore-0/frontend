import type {StoreProductCard} from "./store-model";

export type StoreProductSnapshot=StoreProductCard&{catalogSlug?:string};

/** Keep the cart's price, stock and saved URL until the detail request confirms a change. */
export function mergeStoreProductSnapshots(current:Record<string,StoreProductSnapshot>,products:StoreProductCard[],cart:Record<string,number>,source:"catalog"|"verified"="catalog"){
 const next={...current};
 for(const product of products){
  const cached=next[product.id];
  if(source==="catalog"&&cart[product.id]&&cached){
   if(cached.slug!==product.slug&&cached.catalogSlug!==product.slug)next[product.id]={...cached,catalogSlug:product.slug};
   continue;
  }
  next[product.id]=product;
 }
 return next;
}
