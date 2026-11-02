import type {StoreProductCard} from "./store-model";

/** Cached catalogue projections must never downgrade cart-owned snapshots. */
export function mergeStoreProductSnapshots(current:Record<string,StoreProductCard>,products:StoreProductCard[],cart:Record<string,number>,source:"catalog"|"verified"="catalog"){
 const next={...current};
 for(const product of products){
  if(source==="catalog"&&cart[product.id]&&current[product.id])continue;
  next[product.id]=product;
 }
 return next;
}
