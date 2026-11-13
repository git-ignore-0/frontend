import {isStoreDeliveryDate} from "./store-delivery.ts";
import type {checkoutPayload} from "./store-quote";
import {STORE_MAX_LINE_QUANTITY,STORE_MAX_ORDER_LINES} from "./store-limits";

export type StoreCheckoutPayload=ReturnType<typeof checkoutPayload>;
export type StoreCheckoutIntent={owner:string;payload:StoreCheckoutPayload;buyAgain?:{orderId:string;sessionId:string}};
type IntentStorage=Pick<Storage,"getItem"|"setItem"|"removeItem">&Partial<Pick<Storage,"length"|"key">>;
type RecordValue=Record<string,unknown>;
const intentPrefix="nfv_store_checkout_intent_v1:";
const pendingOwnerKey="nfv_store_checkout_pending_owner_v1";
const storageKey=(owner:string)=>`${intentPrefix}${encodeURIComponent(owner)}`;
const guestOwners=["guest","error","expired"] as const;
const uuid=(value:unknown):value is string=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const record=(value:unknown):value is RecordValue=>!!value&&typeof value==="object"&&!Array.isArray(value);
const integer=(value:unknown,min=0,max=Number.MAX_SAFE_INTEGER):value is number=>Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;
const text=(value:unknown,max:number):value is string=>typeof value==="string"&&!!value.trim()&&value.length<=max;
const exactKeys=(value:RecordValue,keys:string[])=>Object.keys(value).every(key=>keys.includes(key));

/** Validate the full strict Backend request contract before replaying any stored request. */
export function isCheckoutPayload(value:unknown,guest:boolean):value is StoreCheckoutPayload{
 if(!record(value)||!exactKeys(value,["delivery_date","idempotency_key","locale","lines","guest","expected_shipping_fee_vnd","expected_total_vnd","shipping_address_updated_at","coupon_code","expected_voucher_quote"]))return false;
 const hasVoucher=Object.hasOwn(value,"coupon_code")||Object.hasOwn(value,"expected_voucher_quote");
 if(hasVoucher&&(guest||typeof value.coupon_code!=="string"||!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(value.coupon_code)||typeof value.expected_voucher_quote!=="string"||!/^[a-f0-9]{40}$/.test(value.expected_voucher_quote)))return false;
 if(!isStoreDeliveryDate(value.delivery_date))return false;
 if(!uuid(value.idempotency_key)||(value.locale!=="vi"&&value.locale!=="en")||!integer(value.expected_shipping_fee_vnd)||!integer(value.expected_total_vnd))return false;
 if(!Array.isArray(value.lines)||!value.lines.length||value.lines.length>STORE_MAX_ORDER_LINES)return false;
 const products=new Set<string>();
 for(const line of value.lines){
  if(!record(line)||!exactKeys(line,["product_id","quantity","use_quota","expected_unit_price_vnd","expected_available_quantity","expected_quota_quantity"]))return false;
  if(!uuid(line.product_id)||products.has(line.product_id)||!integer(line.quantity,1,STORE_MAX_LINE_QUANTITY)||typeof line.use_quota!=="boolean"||!integer(line.expected_unit_price_vnd,1)||!integer(line.expected_available_quantity,0,2147483647)||!integer(line.expected_quota_quantity,0,line.quantity))return false;
  products.add(line.product_id);
 }
 if(guest){
  const address=value.guest;
  return value.shipping_address_updated_at===undefined&&record(address)&&exactKeys(address,["recipient_name","phone_number","province_code","ward_code","address"])&&text(address.recipient_name,200)&&typeof address.phone_number==="string"&&/^\+84[1-9]\d{8,9}$/.test(address.phone_number)&&typeof address.province_code==="string"&&/^\d{2}$/.test(address.province_code)&&typeof address.ward_code==="string"&&/^\d{1,5}$/.test(address.ward_code)&&text(address.address,500);
 }
 return value.guest===undefined&&typeof value.shipping_address_updated_at==="string"&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value.shipping_address_updated_at)&&Number.isFinite(Date.parse(value.shipping_address_updated_at));
}

/** Keep older guest attempts discoverable without treating auth-check status as identity. */
export function readCheckoutIntent(storage:IntentStorage,owner:string):StoreCheckoutIntent|null{
 const owners=owner==="guest"?guestOwners:[owner];
 let intent:StoreCheckoutIntent|null=null;
 for(const storedOwner of owners){
  const raw=storage.getItem(storageKey(storedOwner));
  if(raw===null)continue;
  const value:unknown=JSON.parse(raw);
  if(record(value)&&record(value.payload)&&!Object.hasOwn(value.payload,"delivery_date"))throw Error("legacy_checkout_intent");
  if(!record(value)||value.owner!==storedOwner||!isCheckoutPayload(value.payload,owner==="guest"))throw Error("invalid_checkout_intent");
  if(value.buyAgain!==undefined&&(owner==="guest"||!record(value.buyAgain)||!uuid(value.buyAgain.orderId)||!uuid(value.buyAgain.sessionId)))throw Error("invalid_checkout_intent");
  const next:StoreCheckoutIntent={owner,payload:value.payload,...(value.buyAgain?{buyAgain:value.buyAgain as StoreCheckoutIntent["buyAgain"]}:{})};
  // Never pick between different outstanding requests or different payloads sharing one key.
  if(intent&&JSON.stringify(intent)!==JSON.stringify(next))throw Error("conflicting_checkout_intents");
  intent=next;
 }
 return intent;
}

/** The unresolved request belongs to its original owner, independently of current login. */
export function pendingCheckoutOwner(storage:IntentStorage,currentOwner:string):string|null{
 const marked=storage.getItem(pendingOwnerKey);
 if(marked!==null&&!text(marked,200))throw Error("invalid_checkout_owner");
 const candidates=new Set([currentOwner,"guest"]);
 if(marked)candidates.add(marked);
 const reauth=checkoutSignInOwner(storage);
 if(reauth)candidates.add(reauth);
 // Migrate attempts saved before the owner pointer was introduced, including another account.
 if(typeof storage.key==="function"&&typeof storage.length==="number"){
  for(let index=0;index<storage.length;index++){
   const key=storage.key(index);
   if(!key?.startsWith(intentPrefix))continue;
   const owner=decodeURIComponent(key.slice(intentPrefix.length));
   if(!text(owner,200))throw Error("invalid_checkout_owner");
   candidates.add(guestOwners.includes(owner as typeof guestOwners[number])?"guest":owner);
  }
 }
 let pending:string|null=null;
 for(const candidate of candidates){
  const attempt=readCheckoutIntent(storage,candidate);
  if(!attempt)continue;
  if(pending!==null&&pending!==attempt.owner)throw Error("conflicting_checkout_intents");
  pending=attempt.owner;
 }
 if(marked!==null&&marked!==pending)throw Error("invalid_checkout_intent");
 if(pending!==null)storage.setItem(pendingOwnerKey,pending);
 return pending;
}

export function saveCheckoutIntent(storage:IntentStorage,intent:StoreCheckoutIntent){
 if(intent.buyAgain&&(intent.owner==="guest"||!uuid(intent.buyAgain.orderId)||!uuid(intent.buyAgain.sessionId)))throw Error("invalid_checkout_intent");
 if(!intent.owner||!isCheckoutPayload(intent.payload,intent.owner==="guest"))throw Error("invalid_checkout_intent");
 const pending=pendingCheckoutOwner(storage,intent.owner);
 if(pending!==null&&pending!==intent.owner)throw Error("conflicting_checkout_intents");
 const existing=readCheckoutIntent(storage,intent.owner);
 if(existing&&JSON.stringify(existing)!==JSON.stringify(intent))throw Error("conflicting_checkout_intents");
 storage.setItem(storageKey(intent.owner),JSON.stringify(intent));
 storage.setItem(pendingOwnerKey,intent.owner);
}

export function clearCheckoutIntent(storage:IntentStorage,owner:string){
 for(const storedOwner of owner==="guest"?guestOwners:[owner])storage.removeItem(storageKey(storedOwner));
 if(storage.getItem(pendingOwnerKey)===owner)storage.removeItem(pendingOwnerKey);
}

const checkoutCouponErrors=["coupon_invalid","coupon_invalid_value","coupon_scope_mismatch","coupon_inactive","coupon_not_started","coupon_expired","coupon_usage_exhausted","coupon_authentication_required","coupon_already_used","coupon_minimum_amount_not_met"];

/** Only service errors raised after the Backend's idempotency lookup prove rejection. */
export function checkoutDefinitelyRejected(error:{status?:number;code?:string}):boolean{
 const conflicts=["store_requote_required","store_stock_changed","store_quota_changed","store_membership_frozen"];
 const rejected=["store_duplicate_product","store_product_changed","store_quota_unavailable","store_shipping_address_invalid","store_shipping_address_required","store_guest_address_required","store_shipping_area_unsupported","store_phone_invalid","store_delivery_date_invalid"];
 return error.status===409&&conflicts.includes(error.code??"")||error.status===400&&(rejected.includes(error.code??"")||checkoutCouponErrors.includes(error.code??""))||error.status===503&&error.code==="store_payment_unavailable";
}

/** Select the resource recovery path only after a checkout is definitively rejected. */
export function checkoutRequoteReason(error:{status?:number;code?:string;context?:{reason?:unknown}}):string|null{
 const reasons:Record<string,string>={
  store_delivery_date_invalid:"delivery_date_invalid",
  store_product_changed:"product_changed",
  store_quota_unavailable:"quota_changed",
  store_shipping_area_unsupported:"shipping_area_unsupported",
  store_shipping_address_invalid:"shipping_address_changed",
  store_shipping_address_required:"shipping_address_changed",
  store_stock_changed:"stock_changed",
  store_quota_changed:"quota_changed",
 };
 if(error.status===409&&(error.code==="store_requote_required"||error.code==="store_stock_changed"||error.code==="store_quota_changed"))return typeof error.context?.reason==="string"?error.context.reason:reasons[error.code??""]??"changed";
 if(error.status===400&&checkoutCouponErrors.includes(error.code??""))return "voucher_changed";
 return error.status===400?reasons[error.code??""]??null:null;
}


const reauthKey="nfv_store_checkout_reauth_v1";
export function checkoutSignInOwner(storage:IntentStorage):string|null{
 const value=storage.getItem(reauthKey);
 if(value===null)return null;
 if(!text(value,200))throw Error("invalid_checkout_owner");
 return value;
}
export function requireCheckoutSignIn(storage:IntentStorage,owner:string){
 if(!text(owner,200)||guestOwners.includes(owner as typeof guestOwners[number]))throw Error("invalid_checkout_owner");
 storage.setItem(reauthKey,owner);
}
export function clearCheckoutSignIn(storage:IntentStorage,owner:string){
 if(checkoutSignInOwner(storage)===owner)storage.removeItem(reauthKey);
}
