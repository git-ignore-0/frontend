type CartState={
 cart:Record<string,number>;
 applyCSA:Record<string,boolean>;
 cartProductNotice:Record<string,"price_changed"|"stock_changed">;
};

/** Resolve the submitted basket against live quantities, including changes made during recovery. */
export function cartAfterCheckout(current:CartState,lines:ReadonlyArray<{product_id:string;quantity:number}>):CartState{
 const cart={...current.cart},applyCSA={...current.applyCSA},cartProductNotice={...current.cartProductNotice};
 for(const line of lines){
  const remaining=Math.max(0,(cart[line.product_id]??0)-line.quantity);
  if(remaining)cart[line.product_id]=remaining;
  else{delete cart[line.product_id];delete applyCSA[line.product_id];delete cartProductNotice[line.product_id]}
 }
 return {cart,applyCSA,cartProductNotice};
}
