export const CART_STORAGE_KEY="nfv-cart-v1";

type CartStorage=Pick<Storage,"getItem"|"setItem"|"removeItem">;

function validCart(value:unknown):Record<string,number>{
  if(!value||typeof value!=="object"||Array.isArray(value))return {};
  const cart:Record<string,number>={};
  for(const [id,count] of Object.entries(value)){
    if(!/^[A-Za-z0-9_-]{1,100}$/.test(id)||!Number.isInteger(count)||Number(count)<=0)continue;
    cart[id]=Math.min(99,Number(count));
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
