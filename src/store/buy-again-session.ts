type SessionStorage=Pick<Storage,"getItem"|"setItem"|"removeItem">;
export type BuyAgainSession={owner:string;orderId:string;sessionId:string};
const key="nfv_store_buy_again_v1";
export function readBuyAgain(storage:SessionStorage,owner:string):BuyAgainSession|null{
 const raw=storage.getItem(key);if(!raw)return null;
 const value:unknown=JSON.parse(raw);
 if(!value||typeof value!=="object"||!("owner" in value)||value.owner!==owner)return null;
 if(!("orderId" in value)||typeof value.orderId!=="string"||!("sessionId" in value)||typeof value.sessionId!=="string")throw Error("invalid_buy_again");
 return {owner,orderId:value.orderId,sessionId:value.sessionId};
}
export function saveBuyAgain(storage:SessionStorage,session:BuyAgainSession){storage.setItem(key,JSON.stringify(session))}
export function clearBuyAgain(storage:SessionStorage,owner:string,sessionId:string){if(readBuyAgain(storage,owner)?.sessionId===sessionId)storage.removeItem(key)}
/** Drop a previous account's prepared source; unresolved checkout intents remain recoverable. */
export function retainBuyAgainOwner(storage:SessionStorage,owner:string|null){
 const raw=storage.getItem(key);if(!raw)return;
 try{const value:unknown=JSON.parse(raw);if(!owner||!value||typeof value!=="object"||!("owner" in value)||value.owner!==owner)storage.removeItem(key)}catch{storage.removeItem(key)}
}
