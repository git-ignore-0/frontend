import {STORE_MAX_LINE_QUANTITY} from "../store/store-limits";

export const CART_STORAGE_KEY="nfv-cart-v1";
export const CART_PRODUCT_STORAGE_KEY="nfv-cart-products-v1";

type CartStorage=Pick<Storage,"getItem"|"setItem"|"removeItem">;

function validCart(value:unknown):Record<string,number>{
  if(!value||typeof value!=="object"||Array.isArray(value))return {};
  const cart:Record<string,number>={};
  for(const [id,count] of Object.entries(value)){
    if(!/^[A-Za-z0-9_-]{1,100}$/.test(id)||!Number.isInteger(count)||Number(count)<=0)continue;
    cart[id]=Math.min(STORE_MAX_LINE_QUANTITY,Number(count));
  }
  return cart;
}

export function loadCart(storage:CartStorage):Record<string,number>{
  try{
    const raw=storage.getItem(CART_STORAGE_KEY);
    return raw?validCart(JSON.parse(raw)):{};
  }catch{return {};}
}

export function saveCart(storage:CartStorage,cart:Record<string,number>):void{
  try{
    const safe=validCart(cart);
    if(Object.keys(safe).length===0)storage.removeItem(CART_STORAGE_KEY);
    else storage.setItem(CART_STORAGE_KEY,JSON.stringify(safe));
  }catch{
    // Storage may be unavailable in hardened/private browser contexts.
  }
}

export function loadCartProducts(storage:CartStorage):Record<string,unknown>{
 try{const value=JSON.parse(storage.getItem(CART_PRODUCT_STORAGE_KEY)??"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}catch{return {}}
}
export function saveCartProducts(storage:CartStorage,products:Record<string,unknown>):void{
 try{if(Object.keys(products).length)storage.setItem(CART_PRODUCT_STORAGE_KEY,JSON.stringify(products));else storage.removeItem(CART_PRODUCT_STORAGE_KEY)}catch{}
}
