"use client";

import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";
import {StoreSection,StorePageHeading,StoreProductRow,StoreRecipientSummary,StoreSummaryAmounts} from "@/components/store/StorePrimitives";
import {SideDrawer} from "@/components/overlays/OverlayPrimitives";
import {Button,DataState,Icon,MoneyLine,Photo,Quantity} from "@/components/UI";
import {DiscountCodeField} from "@/components/DiscountCodeField";
import {VOUCHER_COPY,couponErrorMessage} from "@/lib/voucher-copy";
import {useNFV} from "@/state/NFVContext";
import {useAuth} from "@/auth/AuthProvider";
import {isUnauthorized} from "@/auth/auth-service";
import {siteAuthHref,siteLogoutHref} from "@/auth/site-auth";
import {readBuyAgain,clearBuyAgain,type BuyAgainSession} from "@/store/buy-again-session";
import {buyAgainMessage} from "@/store/use-buy-again";
import {prepareBuyAgain,type BuyAgainLine} from "@/store/store-order-service";
import {useStoreSession} from "@/store/use-store-session";
import {formatUnitSize} from "@/store/store-format";
import {money} from "@/lib/format";
import {csaHundredths} from "../lib/csa-units.ts";
import {getSupportedShippingAreas} from "@/account/shipping-service";
import type {SupportedShippingProvince} from "@/account/shipping-address-model";
import {EMPTY_SHIPPING_ADDRESS,reviewGuestBuyer,type ShippingAddressDraft} from "@/account/shipping-address-model";
import {GuestBuyerFields} from "@/components/account/GuestBuyerFields";
import {buildStoreQuote,checkoutPayload} from "@/store/store-quote";
import {parseStoreProductDetail} from "@/store/store-model";
import {createStoreCheckout,getShippingQuote,getStoreQuota,storeOrderHref,previewStoreVoucher,type StoreVoucherPreview} from "@/store/store-order-service";
import {readCheckoutIntent,pendingCheckoutOwner,saveCheckoutIntent,clearCheckoutIntent,checkoutSignInOwner,requireCheckoutSignIn,clearCheckoutSignIn,checkoutDefinitelyRejected,checkoutRequoteReason,type StoreCheckoutIntent} from "@/store/checkout-intent";
import {STORE_MAX_LINE_QUANTITY,STORE_MAX_ORDER_LINES} from "@/store/store-limits";
import {cartAfterCheckout} from "@/store/cart-checkout";
import {AccountApiError} from "@/account/account-api";

const COPY={
 vi:{cart:"Giỏ đi chợ",close:"Đóng giỏ hàng",empty:"Chiếc giỏ đang trống",emptyBody:"Chọn nông sản để thêm vào giỏ hàng.",explore:"Khám phá nông sản",remove:"Xóa",goods:"Tiền hàng",checkout:"Tiến hành đặt hàng",continue:"Tiếp tục mua sắm",unavailable:"Sản phẩm không còn bán",refreshing:"Đang làm mới sản phẩm…",refreshError:"Chưa thể làm mới sản phẩm",out:"Hết hàng",priceChanged:"Giá vừa được cập nhật.",stockChanged:"Số lượng có thể mua vừa thay đổi.",acknowledge:"Dùng thông tin mới",title:"Đặt nông sản",recipient:"Giao đến",editAddress:"Sửa địa chỉ",quota:"Dùng quyền lợi CSA",quotaPoints:"Dùng {points} điểm CSA",quotaPartial:"còn trả",quotaInsufficient:"Chưa đủ quyền lợi CSA, thanh toán bằng tiền",quotaUsed:"CSA thanh toán",cash:"Tiền hàng cần trả",shipping:"Phí giao",freeShipping:"Miễn phí do CSA đang hiệu lực và đơn có sản phẩm CSA",total:"Tổng chuyển khoản",confirm:"Tiếp tục",acceptQuote:"Xác nhận thông tin mới",loading:"Đang tải thông tin đơn hàng…",unsupported:"Khu vực này chưa được hỗ trợ giao hàng.",addressRequired:"Vui lòng bổ sung địa chỉ giao hàng trong Tài khoản.",addressLoading:"Đang tải địa chỉ giao hàng…",addressError:"Chưa thể tải địa chỉ giao hàng.",retry:"Thử lại",changed:"Dữ liệu đơn hàng vừa thay đổi. Hãy kiểm tra lại và xác nhận lần nữa.",priceRequote:"Giá sản phẩm vừa thay đổi. Hãy kiểm tra và xác nhận thông tin mới.",stockRequote:"Tồn kho vừa thay đổi. Hãy kiểm tra và xác nhận số lượng mới.",quotaRequote:"Quota khả dụng vừa thay đổi. Hãy kiểm tra và xác nhận phân bổ mới.",addressRequote:"Địa chỉ giao hàng vừa thay đổi. Hãy kiểm tra và xác nhận địa chỉ mới.",totalRequote:"Phí giao hoặc tổng tiền vừa thay đổi. Hãy kiểm tra và xác nhận tổng mới.",paymentUnavailable:"Cửa hàng tạm chưa nhận chuyển khoản. Vui lòng thử lại sau.",failed:"Không thể tạo đơn. Vui lòng thử lại.",loadFailed:"Chưa thể tải dữ liệu checkout.",tooManyProducts:`Giỏ hàng tối đa ${STORE_MAX_ORDER_LINES} sản phẩm khác nhau. Vui lòng xóa bớt để tiếp tục.`},
 en:{cart:"Shopping cart",close:"Close cart",empty:"Your cart is empty",emptyBody:"Choose farm products to add to your cart.",explore:"Explore products",remove:"Remove",goods:"Items subtotal",checkout:"Proceed to checkout",continue:"Continue shopping",unavailable:"Product is no longer available",refreshing:"Refreshing product…",refreshError:"Product could not be refreshed",out:"Out of stock",priceChanged:"The price was updated.",stockChanged:"Available stock was updated.",acknowledge:"Use updated details",title:"Order farm products",recipient:"Deliver to",editAddress:"Edit address",quota:"Use CSA benefit",quotaPoints:"Use {points} CSA points",quotaPartial:"remaining",quotaInsufficient:"Insufficient CSA benefit; pay in cash",quotaUsed:"Covered by CSA",cash:"Cash goods subtotal",shipping:"Delivery fee",freeShipping:"Free with an active CSA and a CSA product in this order",total:"Transfer total",confirm:"Continue",acceptQuote:"Confirm updated details",loading:"Loading order details…",unsupported:"This delivery area is not supported.",addressRequired:"Add a delivery address in Account before checkout.",addressLoading:"Loading delivery address…",addressError:"The delivery address could not be loaded.",retry:"Try again",changed:"Order data just changed. Review it and confirm again.",priceRequote:"A product price changed. Review and confirm the updated details.",stockRequote:"Stock changed. Review and confirm the updated availability.",quotaRequote:"Available quota changed. Review and confirm the updated allocation.",addressRequote:"The delivery address changed. Review and confirm the updated address.",totalRequote:"The delivery fee or total changed. Review and confirm the updated total.",paymentUnavailable:"Bank transfers are temporarily unavailable. Please try again later.",failed:"The order could not be created. Try again.",loadFailed:"Checkout data could not be loaded.",tooManyProducts:`Your cart can contain up to ${STORE_MAX_ORDER_LINES} different products. Remove some products to continue.`},
};

export function CartDrawer(){
 const {data,ui,patch,updateCart,acknowledgeCartProduct,retryCartProduct,beginCheckout}=useNFV(),copy=COPY[ui.locale];
 if(!ui.cartOpen)return null;
 const rows=Object.entries(ui.cart).map(([id,quantity])=>({id,quantity,product:data.storeProducts[id],state:ui.cartProductState[id],notice:ui.cartProductNotice[id]}));
 const valid=rows.filter(row=>row.product&&row.state==="ready"&&!row.notice&&row.quantity<=row.product.available_quantity);
 const tooManyProducts=rows.length>STORE_MAX_ORDER_LINES;
 const blocked=tooManyProducts||rows.some(row=>!row.product||row.state!=="ready"||!!row.notice||row.quantity>row.product.available_quantity);
 const subtotal=rows.reduce((sum,row)=>sum+(row.product?.retail_price_vnd??0)*row.quantity,0);
 const count=Object.values(ui.cart).reduce((a,b)=>a+b,0);
 return <SideDrawer title={`${copy.cart} (${count})`} closeLabel={copy.close} onClose={()=>patch({cartOpen:false})} className="cart-overlay">
  {rows.length?<><div className="drawer-body">{rows.map(row=>{
   const p=row.product;
   const message=row.state==="unavailable"?copy.unavailable:row.state==="error"?copy.refreshError:row.state==="loading"?copy.refreshing:row.notice==="price_changed"?copy.priceChanged:row.notice==="stock_changed"||p&&row.quantity>p.available_quantity?copy.stockChanged:p&&p.available_quantity===0?copy.out:"";
   return <div className="drawer-item" data-cart-row={row.id} key={row.id}><div className="drawer-thumb"><Photo src={p?.primary_image?.url} alt={p?.name??row.id} locale={ui.locale}/></div><div><div className="flex" style={{alignItems:"start",gap:5}}><div className="grow"><div className="item-name">{p?.name??row.id}</div>{p&&<div className="item-meta">{formatUnitSize(p.unit_size)} {p.unit_label} · {money(p.retail_price_vnd)}</div>}{message&&<div className="help-error">{message}</div>}{row.state==="error"&&<Button small variant="plain" onClick={()=>retryCartProduct(row.id)}>{copy.retry}</Button>}{row.notice&&<Button small variant="plain" onClick={()=>acknowledgeCartProduct(row.id)}>{copy.acknowledge}</Button>}</div><button className="remove-link" onClick={()=>updateCart(row.id,-row.quantity)}>{copy.remove}</button></div>{p&&<div className="drawer-row-bottom"><Quantity id={p.name} min={0} max={Math.min(STORE_MAX_LINE_QUANTITY,p.available_quantity)} count={row.quantity} locale={ui.locale} onMinus={()=>updateCart(row.id,-1)} onPlus={()=>updateCart(row.id,1)}/><strong>{money(p.retail_price_vnd*row.quantity)}</strong></div>}</div></div>;
  })}</div><div className="drawer-foot">{tooManyProducts&&<p className="help-error" role="alert">{copy.tooManyProducts}</p>}<MoneyLine label={copy.goods} value={money(subtotal)}/><Button style={{width:"100%"}} disabled={blocked||!valid.length} onClick={beginCheckout}>{copy.checkout} <Icon name="arrow" size={17}/></Button><Button variant="plain" style={{width:"100%"}} onClick={()=>patch({cartOpen:false})}>{copy.continue}</Button></div></>:<div className="drawer-body cart-empty"><DataState icon="bag" title={copy.empty} description={copy.emptyBody} action={{label:copy.explore,onClick:()=>patch({cartOpen:false})}}/></div>}
 </SideDrawer>;
}

type Guest=ShippingAddressDraft;
const EMPTY=EMPTY_SHIPPING_ADDRESS;
const GUEST_DRAFT="nfv_store_checkout_guest_v1";
function voucherMessage(error:unknown,locale:"vi"|"en"){
 const c=VOUCHER_COPY[locale],code=error instanceof AccountApiError?error.code:"";
 if(code.startsWith("coupon_"))return couponErrorMessage(code,locale);
 const messages:Record<string,string>={store_phone_invalid:COPY[locale].addressRequote};
 return Object.prototype.hasOwnProperty.call(messages,code)?messages[code]:c.failed;
}
function sameAddressVersion(left:string,right:string){
 // Normalize equivalent offsets without dropping the backend's microseconds.
 const fraction=(value:string)=>(/\.(\d{1,6})(?:Z|[+-]\d{2}:\d{2})$/.exec(value)?.[1]??"").padEnd(6,"0");
 return Date.parse(left)===Date.parse(right)&&fraction(left)===fraction(right);
}

export function Checkout(){
 const storeRequest=useStoreSession(),searchParams=useSearchParams(),buyAgainRequested=searchParams.get("source")==="buy-again";
 const {data,ui,patch,setUI,cacheStoreProducts,refreshResource,cartHydrated,accountSessionKey,retryCartProduct,markCartProductsUnavailable,acknowledgeCartProduct,updateCart}=useNFV(),router=useRouter(),copy=COPY[ui.locale],auth=useAuth();
 const authenticated=auth.status==="authenticated",owner=authenticated?auth.session?.subject??"":"guest",authReady=auth.status==="guest"||authenticated;
 const [areas,setAreas]=useState<SupportedShippingProvince[]>([]),[guest,setGuest]=useState<Guest>(EMPTY),[quota,setQuota]=useState<{active:boolean;products:{productId:string;availableUnits:number}[]}>({active:false,products:[]});
 const [shipping,setShipping]=useState<number|null>(null),[supported,setSupported]=useState(false),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(false),[shippingError,setShippingError]=useState(false),[error,setError]=useState(""),[requote,setRequote]=useState(false),[busy,setBusy]=useState(false);
 const [discountCode,setDiscountCode]=useState("");
 const [quoteKey,setQuoteKey]=useState(""),[shippingKey,setShippingKey]=useState(""),[requoteState,setRequoteState]=useState<"idle"|"loading"|"ready"|"error">("idle");
 const previousOwner=useRef(owner),lifecycle=useRef(0),requoteRequest=useRef(0),requoteReason=useRef<unknown>(null);
 const [loadVersion,setLoadVersion]=useState(0),[shippingVersion,setShippingVersion]=useState(0);
 const checkoutCompleted=useRef(false),submitting=useRef(false),intent=useRef<StoreCheckoutIntent|null>(null),guestLoaded=useRef(false),address=authenticated?data.shippingAddress:null,addressState=ui.accountFetchState.address,provinceCode=authenticated?address?.provinceCode:guest.provinceCode,wardCode=authenticated?address?.wardCode:guest.wardCode;
 const loadKey=`${owner}:${ui.locale}:${loadVersion}`,expectedShippingKey=`${owner}:${provinceCode??""}:${wardCode??""}:${shippingVersion}`,quotePending=loading||quoteKey!==loadKey,shippingResolved=shippingKey===expectedShippingKey,shippingKnown=shippingResolved&&shipping!==null;

 const [guestSubmitted,setGuestSubmitted]=useState(false);
 const [intentOwner,setIntentOwner]=useState(""),[recovering,setRecovering]=useState(false),[intentError,setIntentError]=useState(false),[intentVersion,setIntentVersion]=useState(0);
 const [pendingOwner,setPendingOwner]=useState<string|null>(null);
 const [recoveryTotal,setRecoveryTotal]=useState<number|null>(null),[reauthOwner,setReauthOwner]=useState<string|null>(null);
 const [buyAgainMode,setBuyAgainMode]=useState(false),[sourceInitialized,setSourceInitialized]=useState(false);
 const [buyAgainSession,setBuyAgainSession]=useState<BuyAgainSession|null>(null),[buyAgainRows,setBuyAgainRows]=useState<BuyAgainLine[]>([]),[sourceKey,setSourceKey]=useState(""),[sourceError,setSourceError]=useState(""),[sourceVersion,setSourceVersion]=useState(0);
 const [sourceMissing,setSourceMissing]=useState(false);
 const [buyAgainCSA,setBuyAgainCSA]=useState<Record<string,boolean>>({});
 const sourceCurrent=buyAgainSession?.owner===owner&&sourceKey===`${owner}:${ui.locale}:${sourceVersion}`;
 const sourceRows=sourceCurrent?buyAgainRows:[];
 const quantities=buyAgainMode?Object.fromEntries(sourceRows.map(line=>[line.productId,line.quantity])):ui.cart;
 const useQuota=buyAgainMode?buyAgainCSA:ui.applyCSA;
 const products=buyAgainMode?sourceRows.flatMap(line=>line.product?[line.product]:[]):Object.keys(ui.cart).map(id=>data.storeProducts[id]).filter(Boolean);
 const rememberSignIn=useCallback((attempt:StoreCheckoutIntent|null)=>{
  if(!attempt||attempt.owner==="guest")return;
  try{requireCheckoutSignIn(window.sessionStorage,attempt.owner);setReauthOwner(attempt.owner)}catch{setIntentError(true)}
 },[]);


 useEffect(()=>{queueMicrotask(()=>{try{const saved=window.sessionStorage.getItem(GUEST_DRAFT);guestLoaded.current=true;if(saved)setGuest({...EMPTY,...JSON.parse(saved)})}catch{guestLoaded.current=true}})},[]);
 useEffect(()=>{if(!guestLoaded.current)return;try{window.sessionStorage.setItem(GUEST_DRAFT,JSON.stringify(guest))}catch{}},[guest]);
 useEffect(()=>{let live=true;queueMicrotask(()=>{if(live){setLoading(true);setLoadError(false)}});Promise.all([getSupportedShippingAreas(ui.locale),authenticated?storeRequest(()=>getStoreQuota(ui.locale),()=>rememberSignIn(intent.current)):Promise.resolve({active:false,products:[]})]).then(([nextAreas,nextQuota])=>{if(live){setAreas(nextAreas);setQuota(nextQuota)}}).catch(()=>{if(live)setLoadError(true)}).finally(()=>{if(live){setQuoteKey(loadKey);setLoading(false)}});return()=>{live=false}},[authenticated,owner,ui.locale,loadVersion,loadKey,storeRequest,rememberSignIn]);
 useEffect(()=>{let live=true;if(!provinceCode||!wardCode){queueMicrotask(()=>{if(live){setSupported(false);setShipping(null);setShippingError(false)}});return()=>{live=false}}queueMicrotask(()=>{if(live){setShipping(null);setShippingError(false)}});getShippingQuote(provinceCode,wardCode).then(result=>{if(live){setSupported(result.supported);setShipping(result.shippingFeeVnd);setShippingKey(expectedShippingKey)}}).catch(()=>{if(live){setSupported(false);setShipping(null);setShippingError(true)}});return()=>{live=false}},[provinceCode,wardCode,shippingVersion,expectedShippingKey]);

 // Session/locale changes invalidate pending work but never reopen a completed checkout.
 useEffect(()=>{if(previousOwner.current!==owner){previousOwner.current=owner;if(!buyAgainMode)patch({applyCSA:{}})}lifecycle.current+=1;submitting.current=checkoutCompleted.current;setBusy(checkoutCompleted.current);setRequote(false);setRequoteState("idle");setError("");setRecovering(!!intent.current);setRecoveryTotal(intent.current?.payload.expected_total_vnd??null);return()=>{lifecycle.current+=1}},[owner,auth.status,ui.locale,patch,buyAgainMode]);
 // Replaying the exact saved request also works when prices, address or cart changed after reload.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{intent.current=null;setRecovering(false);setRecoveryTotal(null);setIntentError(false);setPendingOwner(null);setReauthOwner(null);try{const pending=pendingCheckoutOwner(window.sessionStorage,owner);setPendingOwner(pending);setReauthOwner(checkoutSignInOwner(window.sessionStorage));intent.current=pending!==null&&pending!==owner?null:readCheckoutIntent(window.sessionStorage,owner);setRecovering(!!intent.current);setRecoveryTotal(intent.current?.payload.expected_total_vnd??null)}catch{setIntentError(true)}setIntentOwner(owner)},[owner,intentVersion]);
 useEffect(()=>{
  let live=true;
  const load=async()=>{
   if(live)setSourceInitialized(true);
   try{
    const saved=readCheckoutIntent(window.sessionStorage,owner);
    const mode=saved?!!saved.buyAgain:buyAgainRequested;
    if(!live)return;
    setBuyAgainMode(mode);setSourceMissing(false);setSourceError("");setBuyAgainCSA({});
    if(!mode)return;
    const session=saved?.buyAgain?{owner,...saved.buyAgain}:readBuyAgain(window.sessionStorage,owner);
    setBuyAgainSession(session);setBuyAgainRows([]);setSourceKey("");
    if(!authenticated||!session){setSourceMissing(true);return;}
    const rows=await storeRequest(()=>prepareBuyAgain(session.orderId,ui.locale));
    if(!live)return;
    setBuyAgainRows(rows);setSourceError(buyAgainMessage(rows,ui.locale));setSourceKey(`${owner}:${ui.locale}:${sourceVersion}`);
   }catch{if(live)setSourceError(ui.locale==="vi"?"Chưa thể kiểm tra sản phẩm. Vui lòng thử lại.":"Products could not be checked. Please try again.")}
  };
  void load();return()=>{live=false};
 },[owner,authenticated,ui.locale,sourceVersion,storeRequest,buyAgainRequested,intentVersion]);
 const quote=useMemo(()=>buildStoreQuote({products,quantities,useQuota,quota:quota.products,shippingFeeVnd:shipping??0,hasActiveCsa:authenticated&&quota.active&&!quotePending}),[products,quota,shipping,useQuota,quantities,authenticated,quotePending]);
 const guestReview=reviewGuestBuyer(guest,areas),guestValid=guestReview.complete;
 const tooManyProducts=Object.keys(quantities).length>STORE_MAX_ORDER_LINES;
 const cartReady=buyAgainMode?sourceInitialized&&sourceKey===`${owner}:${ui.locale}:${sourceVersion}`&&!sourceError&&!!buyAgainSession&&buyAgainRows.length>0&&buyAgainRows.every(line=>line.reason===null):cartHydrated&&!tooManyProducts&&products.length===Object.keys(ui.cart).length&&products.every(product=>ui.cartProductState[product.id]==="ready"&&!ui.cartProductNotice[product.id]&&product.available_quantity>=ui.cart[product.id]&&ui.cart[product.id]>0);
 const quoteFinal=accountSessionKey===owner&&(!authenticated||addressState==="ready")&&!quotePending&&!loadError&&!shippingError&&supported&&shippingKnown&&cartReady&&requoteState!=="loading"&&requoteState!=="error";
 const ready=quoteFinal&&accountSessionKey===owner&&(authenticated?!!address?.updatedAt&&address.isSupported!==false&&addressState==="ready":guestValid);
 const voucherCopy=VOUCHER_COPY[ui.locale];
 type VoucherScope={key:string;session:typeof auth.session};
 const [voucherResult,setVoucherResult]=useState<{context:VoucherScope;quote:StoreVoucherPreview}|null>(null),[voucherError,setVoucherError]=useState<{context:VoucherScope;message:string}|null>(null),[voucherPending,setVoucherPending]=useState<VoucherScope|null>(null),[voucherVersion,setVoucherVersion]=useState(0);
 const voucherRequest=useRef(0),voucherInFlight=useRef<string|null>(null),voucherContext=useRef("");
 const voucherKey=JSON.stringify({owner,authenticated,session:auth.session,code:discountCode,locale:ui.locale,source:buyAgainMode?buyAgainSession:null,sourceKey,sourceVersion,quantities,useQuota,address,quota,quote,loadKey,shippingKey,ready,version:voucherVersion});
 const voucherScope=useMemo(()=>({key:voucherKey,session:auth.session}),[voucherKey,auth.session]);
 useLayoutEffect(()=>{voucherContext.current=voucherKey;return()=>{voucherContext.current="";voucherRequest.current+=1;voucherInFlight.current=null}},[voucherKey,auth.session]);
 const currentVoucher=authenticated&&voucherResult?.context===voucherScope?voucherResult.quote:undefined;
 const voucherWanted=authenticated&&discountCode.trim().length>0;
 const voucherLoading=voucherPending===voucherScope;
 const voucherReady=!voucherWanted||!!currentVoucher;
 const displayQuote=currentVoucher?(()=>{
  const lines=quote.lines.map(line=>{
   const expected=currentVoucher.lines.find(item=>item.product_id===line.product.id)!;
   return {...line,product:{...line.product,retail_price_vnd:expected.expected_unit_price_vnd,available_quantity:expected.expected_available_quantity},quantity:expected.quantity,useQuota:expected.use_quota,quotaQuantity:expected.expected_quota_quantity,quotaUnits:expected.expected_quota_quantity*csaHundredths(line.product.csa_quota_group?.cost??0)/100,cashQuantity:expected.quantity-expected.expected_quota_quantity,cashSubtotalVnd:(expected.quantity-expected.expected_quota_quantity)*expected.expected_unit_price_vnd};
  });
  return {...quote,lines,goodsValueVnd:lines.reduce((sum,line)=>sum+line.quantity*line.product.retail_price_vnd,0),quotaValueVnd:lines.reduce((sum,line)=>sum+line.quotaQuantity*line.product.retail_price_vnd,0),cashSubtotalVnd:currentVoucher.subtotalVnd,shippingFeeVnd:currentVoucher.shippingFeeVnd,totalVnd:currentVoucher.totalVnd};
 })():quote;
 const applyVoucher=async()=>{
  if(!authenticated||!ready||busy||intent.current||checkoutCompleted.current||voucherInFlight.current===voucherKey)return;
  if(!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(discountCode.trim().toUpperCase())){setVoucherError({context:voucherScope,message:voucherCopy.invalid});return;}
  const request=++voucherRequest.current,key=voucherKey,code=discountCode.trim().toUpperCase();
  voucherInFlight.current=key;setVoucherPending(voucherScope);setVoucherResult(null);setVoucherError(null);if(!requote)setError("");
  try{
   const result=await storeRequest(()=>previewStoreVoucher({locale:ui.locale,coupon_code:code,lines:quote.lines.map(line=>({product_id:line.product.id,quantity:line.quantity,use_quota:line.useQuota}))}));
   if(request!==voucherRequest.current||key!==voucherContext.current)return;
   if(result.coupon.code!==code||result.lines.length!==quote.lines.length||result.lines.some(line=>!quote.lines.some(item=>item.product.id===line.product_id&&item.quantity===line.quantity&&item.useQuota===line.use_quota)))throw new AccountApiError("invalid_response",502);
   if(!address?.updatedAt||!sameAddressVersion(result.shippingAddressUpdatedAt,address.updatedAt)){
    requoteReason.current="shipping_address_changed";setRequote(true);setError(copy.addressRequote);await refreshRequote();return;
   }
   setVoucherResult({context:voucherScope,quote:result});
  }catch(reason){
   if(request!==voucherRequest.current||key!==voucherContext.current)return;
   const refreshReason=reason instanceof AccountApiError?checkoutRequoteReason(reason):null;
   if(refreshReason&&refreshReason!=="voucher_changed"){
    requoteReason.current=refreshReason;setRequote(true);setError(requoteMessage(refreshReason));await refreshRequote();
   }else setVoucherError({context:voucherScope,message:voucherMessage(reason,ui.locale)});
  }
  finally{if(request===voucherRequest.current){voucherInFlight.current=null;setVoucherPending(null)}}
 };
 const removeVoucher=()=>{if(busy||intent.current||checkoutCompleted.current)return;setDiscountCode("");setVoucherResult(null);setVoucherError(null);setVoucherVersion(value=>value+1)};
 const refreshRequote=async()=>{
  const request=lifecycle.current,sequence=++requoteRequest.current;setRequoteState("loading");setShippingVersion(value=>value+1);
  try{
   const refreshAreas=requoteReason.current==="shipping_area_unsupported"||requoteReason.current==="shipping_address_changed";
   const [nextQuota,refreshed,nextAreas]=await Promise.all([
    authenticated?storeRequest(()=>getStoreQuota(ui.locale),()=>rememberSignIn(intent.current)):Promise.resolve({active:false,products:[]}),
    buyAgainMode?storeRequest(async()=>{if(!buyAgainSession)throw Error("missing_buy_again");return {source:"buy-again" as const,rows:await prepareBuyAgain(buyAgainSession.orderId,ui.locale)}}):Promise.all(products.map(async product=>{
     const response=await fetch(`/api/store/products/${encodeURIComponent(product.slug)}?locale=${ui.locale}&retry=1`,{cache:"no-store"});
     if(response.status===404)return {id:product.id,product:null};
     if(!response.ok)throw Error("refresh_failed");
     return {id:product.id,product:parseStoreProductDetail(await response.json())};
    })).then(rows=>({source:"cart" as const,rows})),
    refreshAreas?getSupportedShippingAreas(ui.locale):Promise.resolve(null),
    authenticated&&refreshAreas?refreshResource("address"):Promise.resolve(),
   ]);
   if(request!==lifecycle.current||sequence!==requoteRequest.current)return;
   setQuota(nextQuota);if(nextAreas)setAreas(nextAreas);
   if(refreshed.source==="buy-again"){
    const rows=refreshed.rows;
    setBuyAgainRows(rows);setSourceError(buyAgainMessage(rows,ui.locale));setSourceKey(`${owner}:${ui.locale}:${sourceVersion}`);
   }else{
    const rows=refreshed.rows;
    cacheStoreProducts(rows.flatMap(row=>row.product?[row.product]:[]),"verified");
    markCartProductsUnavailable(rows.filter(row=>row.product===null).map(row=>row.id));
   }
   if(refreshAreas&&!authenticated)setGuestSubmitted(true);
   setRequoteState("ready");
  }catch{if(request===lifecycle.current&&sequence===requoteRequest.current)setRequoteState("error")}
 };
 const requoteMessage=(reason:unknown)=>reason==="price_changed"?copy.priceRequote:reason==="stock_changed"?copy.stockRequote:reason==="quota_changed"?copy.quotaRequote:reason==="shipping_address_changed"?copy.addressRequote:reason==="total_changed"?copy.totalRequote:copy.changed;
 const submit=async()=>{
  if(!authReady||checkoutCompleted.current||submitting.current||intentOwner!==owner||intentError||pendingOwner!==null&&pendingOwner!==owner)return;
  if(!intent.current){
   if(!authenticated){setGuestSubmitted(true);if(!guestReview.complete)return;}
   if(!ready||!voucherReady||voucherLoading)return;
   const payload=checkoutPayload({quote,voucher:currentVoucher,locale:ui.locale,shippingAddressUpdatedAt:authenticated?address?.updatedAt:undefined,guest:authenticated?undefined:{recipient_name:guestReview.value!.name,phone_number:guestReview.value!.phone,province_code:guestReview.value!.provinceCode,ward_code:guestReview.value!.wardCode,address:guestReview.value!.address},idempotencyKey:crypto.randomUUID()});
   const attempt:StoreCheckoutIntent={owner,payload,...(buyAgainMode&&buyAgainSession?{buyAgain:{orderId:buyAgainSession.orderId,sessionId:buyAgainSession.sessionId}}:{})};
   try{saveCheckoutIntent(window.sessionStorage,attempt)}catch{setIntentError(true);return;}
   intent.current=attempt;setPendingOwner(owner);
  }
  const request=lifecycle.current,attempt=intent.current;
  submitting.current=true;setBusy(true);setError("");
  try{
   const order=await storeRequest(()=>createStoreCheckout(attempt.payload),()=>rememberSignIn(attempt));
   if(request!==lifecycle.current)return;
   // A successful checkout is terminal until navigation unmounts this screen.
   checkoutCompleted.current=true;
   try{clearCheckoutIntent(window.sessionStorage,attempt.owner);clearCheckoutSignIn(window.sessionStorage,attempt.owner);setReauthOwner(null);setPendingOwner(null)}catch{/* A retained request will replay the same Backend order. */}
   intent.current=null;setRecovering(false);
   if(attempt.buyAgain){try{clearBuyAgain(window.sessionStorage,attempt.owner,attempt.buyAgain.sessionId)}catch{}}
   else setUI(state=>({...state,...cartAfterCheckout(state,attempt.payload.lines)}));
   if(!attempt.buyAgain)try{window.sessionStorage.removeItem(GUEST_DRAFT)}catch{}
   if(attempt.buyAgain)router.replace(storeOrderHref(order));
   else router.push(storeOrderHref(order));
  }catch(reason){
   if(request!==lifecycle.current)return;
   if(isUnauthorized(reason))return;
   if(reason instanceof AccountApiError&&checkoutDefinitelyRejected(reason)){
    try{clearCheckoutIntent(window.sessionStorage,attempt.owner);clearCheckoutSignIn(window.sessionStorage,attempt.owner);setReauthOwner(null);setPendingOwner(null);intent.current=null;setRecovering(false)}catch{setIntentError(true);return;}
    const refreshReason=checkoutRequoteReason(reason);
    setVoucherVersion(value=>value+1);
    if(refreshReason==="voucher_changed"){setVoucherError(null);setError(reason.code.startsWith("coupon_")?voucherMessage(reason,ui.locale):voucherCopy.changed)}
    else if(refreshReason){requoteReason.current=refreshReason;setRequote(true);setError(requoteMessage(requoteReason.current));await refreshRequote()}else setError(reason.code==="store_payment_unavailable"?copy.paymentUnavailable:copy.failed);
   }else{setRecoveryTotal(attempt.payload.expected_total_vnd);setRecovering(true);setError("");}
  }finally{if(request===lifecycle.current&&!checkoutCompleted.current){submitting.current=false;setBusy(false)}}
 };

 const intentProblem=intentError&&<div><DataState kind="error" title={ui.locale==="vi"?"Không thể khôi phục lần đặt hàng. Hãy kiểm tra đơn hàng hoặc liên hệ cửa hàng trước khi đặt lại.":"The checkout attempt could not be restored. Check your orders or contact the store before placing another order."} action={{label:copy.retry,onClick:()=>setIntentVersion(value=>value+1)}}/><a className="btn btn-outline" href={`/account/${ui.locale}?tab=orders`}>{ui.locale==="vi"?"Kiểm tra đơn hàng":"Check orders"}</a> <a className="btn btn-plain" href="#site-contact">{ui.locale==="vi"?"Liên hệ cửa hàng":"Contact the store"}</a></div>;
 const requiredMemberOwner=pendingOwner!=="guest"?pendingOwner??reauthOwner:reauthOwner;
 if(auth.status!=="checking"&&auth.status!=="guest"&&intentOwner===owner&&pendingOwner==="guest")return <main className="main-content"><div className="container"><DataState kind="error" title={ui.locale==="vi"?"Lần đặt hàng khi chưa đăng nhập vẫn chưa rõ kết quả. Hãy đăng xuất, rồi mở lại giỏ hàng để kiểm tra đơn đã gửi.":"Your earlier guest checkout is still unresolved. Sign out, then reopen your cart to check that order."}/><form method="post" action={siteLogoutHref(ui.locale)}><Button type="submit">{ui.locale==="vi"?"Đăng xuất để kiểm tra đơn":"Sign out to check the order"}</Button></form></div></main>;
 if(auth.status==="expired"||(auth.status!=="checking"&&requiredMemberOwner!==null&&owner!==requiredMemberOwner))return <main className="main-content"><div className="container"><DataState kind="error" title={requiredMemberOwner!==null?(ui.locale==="vi"?"Đăng nhập bằng tài khoản đã gửi đơn để tiếp tục.":"Sign in with the account that submitted this order to continue."):(ui.locale==="vi"?"Phiên đăng nhập đã hết hạn. Đăng nhập lại để tiếp tục.":"Your session expired. Sign in again to continue.")}/><a className="btn" href={siteAuthHref("login",ui.locale,`/store/checkout/${ui.locale}${buyAgainMode||buyAgainRequested?"?source=buy-again":""}`)}>{ui.locale==="vi"?"Đăng nhập":"Sign in"}</a></div></main>;
 if(!authReady&&auth.status!=="checking")return <main className="main-content"><div className="container"><DataState kind="error" title={ui.locale==="vi"?"Chưa thể xác minh phiên truy cập. Vui lòng thử lại.":"Could not verify your session. Please try again."} action={{label:copy.retry,onClick:()=>void auth.refresh()}}/></div></main>;
 if(!sourceInitialized||!cartHydrated||auth.status==="checking"||accountSessionKey!==owner||intentOwner!==owner)return <main className="main-content"><div className="container"><DataState kind="loading" title={copy.loading}/></div></main>;
 if(!buyAgainMode&&!Object.keys(ui.cart).length&&!recovering&&intentOwner===owner&&!intentError)return <main className="main-content"><div className="container"><DataState title={copy.empty} action={{label:copy.explore,onClick:()=>router.push(`/store/${ui.locale}`)}}/></div></main>;
 if(recovering)return <main className="main-content"><div className="container store-commerce"><StorePageHeading title={copy.title} locale={ui.locale}/><StoreSection title={ui.locale==="vi"?"Kiểm tra đơn đã gửi":"Check submitted order"}>{intentProblem}<p>{ui.locale==="vi"?"Chưa xác định được kết quả lần đặt hàng trước. Kiểm tra lại để tiếp tục với đúng đơn đã gửi.":"The previous checkout result is unknown. Check again to continue with the original order."}</p><MoneyLine label={copy.total} value={recoveryTotal===null?"—":money(recoveryTotal)} large/><Button loading={busy} disabled={busy||intentError||intentOwner!==owner} onClick={()=>void submit()}>{ui.locale==="vi"?"Kiểm tra lại đơn":"Check previous order"}</Button></StoreSection></div></main>;
 if(buyAgainMode&&sourceMissing&&!intentError)return <main className="main-content"><div className="container store-commerce"><StorePageHeading title={copy.title} locale={ui.locale}/><DataState kind="empty" title={ui.locale==="vi"?"Phiên mua lại không còn hiệu lực":"This buy-again session has ended"} description={ui.locale==="vi"?"Mở đơn hàng của bạn để bắt đầu mua lại.":"Open your order to buy again."} action={{label:ui.locale==="vi"?"Đơn hàng của tôi":"My orders",onClick:()=>router.replace(`/account/${ui.locale}?tab=orders`)}}/></div></main>;
 const addressPanel=authenticated
  ? addressState==="loading"?<DataState kind="loading" title={copy.addressLoading}/>
   : addressState==="error"?<DataState kind="error" title={copy.addressError} action={{label:copy.retry,onClick:()=>void refreshResource("address")}}/>
   : address?<StoreRecipientSummary name={address.name} phone={address.phone} address={[address.detail,address.ward,address.city].filter(Boolean).join(", ")} actions={<a className="btn btn-outline btn-small" href={`/account/${ui.locale}?tab=address`}><Icon name="edit" size={14}/>{copy.editAddress}</a>}/>
   :<DataState title={copy.addressRequired} action={{label:copy.editAddress,onClick:()=>router.push(`/account/${ui.locale}?tab=address`)}}/>
  :<GuestBuyerFields locale={ui.locale} value={guest} areas={areas} loading={quotePending} error={loadError} submitted={guestSubmitted} onRetry={()=>setLoadVersion(value=>value+1)} onChange={setGuest}/>;
 return <main className="main-content"><div className="container store-commerce">
  <StorePageHeading title={copy.title} locale={ui.locale}/>
  {intentProblem}
  {buyAgainMode&&sourceError&&<DataState kind="error" title={buyAgainSession?.owner===owner?sourceError:(ui.locale==="vi"?"Chưa thể kiểm tra sản phẩm. Vui lòng thử lại.":"Products could not be checked. Please try again.")} action={{label:copy.retry,onClick:()=>setSourceVersion(value=>value+1)}}/>}
  {tooManyProducts&&<div className="callout" role="alert">{copy.tooManyProducts} <Button small variant="plain" onClick={()=>patch({cartOpen:true})}>{copy.cart}</Button></div>}

  <div className="checkout-flow-layout store-checkout">
   <div className="checkout-flow-main">
    <StoreSection title={copy.recipient}>{addressPanel}</StoreSection>
    <StoreSection title={ui.locale==="vi"?"Sản phẩm":"Products"}>{displayQuote.lines.map(line=><StoreProductRow key={line.product.id} name={line.product.name} image={<Photo src={line.product.primary_image?.url} alt={line.product.name} locale={ui.locale}/>} meta={<>{line.quantity} × {formatUnitSize(line.product.unit_size)} {line.product.unit_label}</>} amount={money(line.quantity*line.product.retail_price_vnd)} actions={authenticated&&!quotePending&&quota.active&&line.product.csa_quota_group?<>
      <label className="csa-apply"><input type="checkbox" checked={!!useQuota[line.product.id]} disabled={busy||requoteState==="loading"} onChange={event=>buyAgainMode?setBuyAgainCSA({...buyAgainCSA,[line.product.id]:event.target.checked}):patch({applyCSA:{...ui.applyCSA,[line.product.id]:event.target.checked}})}/><span>{!line.useQuota?copy.quota:line.quotaQuantity===0?copy.quotaInsufficient:`${copy.quotaPoints.replace("{points}",String(line.quotaUnits))}${line.cashQuantity>0?` · ${copy.quotaPartial} ${money(line.cashSubtotalVnd)}`:""}`}</span></label>
    </>:undefined}>
      {!buyAgainMode&&ui.cartProductState[line.product.id]==="loading"&&<DataState kind="loading" compact title={copy.refreshing}/>}
      {!buyAgainMode&&ui.cartProductState[line.product.id]==="error"&&<DataState kind="error" compact title={copy.refreshError} action={{label:copy.retry,onClick:()=>retryCartProduct(line.product.id)}}/>}
      {!buyAgainMode&&ui.cartProductState[line.product.id]==="unavailable"&&<DataState kind="error" compact title={copy.unavailable} action={{label:copy.remove,onClick:()=>updateCart(line.product.id,-ui.cart[line.product.id])}}/>}
      {!buyAgainMode&&ui.cartProductNotice[line.product.id]&&<div className="help-error" role="status">{ui.cartProductNotice[line.product.id]==="price_changed"?copy.priceChanged:copy.stockChanged}<Button small variant="plain" onClick={()=>acknowledgeCartProduct(line.product.id)}>{copy.acknowledge}</Button></div>}
      {line.quantity>line.product.available_quantity&&<DataState kind="error" compact title={line.product.available_quantity===0?copy.out:copy.stockChanged} action={buyAgainMode?undefined:{label:copy.cart,onClick:()=>patch({cartOpen:true})}}/>}
    </StoreProductRow>)}{!buyAgainMode&&Object.keys(ui.cart).filter(id=>!data.storeProducts[id]).map(id=><DataState key={id} kind="error" compact title={copy.unavailable} action={{label:copy.remove,onClick:()=>updateCart(id,-ui.cart[id])}}/>)}</StoreSection>
    {!quotePending&&shippingResolved&&provinceCode&&wardCode&&!supported&&!shippingError&&<div className="callout" role="alert">{copy.unsupported}</div>}
    {requoteState==="error"&&<DataState kind="error" title={copy.loadFailed} action={{label:copy.retry,onClick:()=>void refreshRequote()}}/>}
    {loadError&&authenticated&&<DataState kind="error" title={copy.loadFailed} action={{label:copy.retry,onClick:()=>setLoadVersion(value=>value+1)}}/>}
    {shippingError&&<DataState kind="error" title={copy.loadFailed} action={{label:copy.retry,onClick:()=>setShippingVersion(value=>value+1)}}/>}
    {error&&<div className="callout" role="alert">{error}</div>}
   </div>
   <StoreSection as="aside" className="store-summary" title={ui.locale==="vi"?"Đơn hàng của bạn":"Your order"}>
    <StoreSummaryAmounts locale={ui.locale} goods={money(displayQuote.goodsValueVnd)} shipping={!shippingKnown||quotePending?"—":displayQuote.shippingFeeVnd===0?(ui.locale==="vi"?"Miễn phí":"Free"):money(displayQuote.shippingFeeVnd)} benefit={authenticated&&displayQuote.quotaValueVnd>0?`−${money(displayQuote.quotaValueVnd)}`:undefined} reserveBenefit={authenticated&&quota.active&&displayQuote.lines.some(line=>!!line.product.csa_quota_group)} total={quoteFinal&&voucherReady&&!voucherLoading?money(displayQuote.totalVnd):"—"} voucher={currentVoucher?{code:currentVoucher.coupon.code,discount:`−${money(currentVoucher.discountAmountVnd)}`}:undefined} cashSubtotal={currentVoucher?money(currentVoucher.subtotalVnd):undefined} discounts={
    <div className="store-discount-code">
     <DiscountCodeField id="storeDiscountCode" locale={ui.locale} value={authenticated?discountCode:""} disabled={!authenticated||busy} loading={voucherLoading} applyDisabled={!ready} error={voucherError?.context===voucherScope?voucherError.message:undefined} signInHref={!authenticated?siteAuthHref("login",ui.locale,`/store/checkout/${ui.locale}${buyAgainMode||buyAgainRequested?"?source=buy-again":""}`):undefined} onChange={value=>{if(busy||intent.current)return;setDiscountCode(value);setVoucherResult(null);setVoucherError(null)}} onClear={removeVoucher} onApply={()=>void applyVoucher()}/>
    </div>}/>
   <div className="checkout-flow-actions store-checkout-actions">
    {(quotePending||requoteState==="loading")&&<p className="sm muted" role="status">{copy.loading}</p>}
    {requote&&<Button variant="outline" disabled={busy||requoteState!=="ready"||!quoteFinal} onClick={()=>{setRequote(false);setError("")}}>{copy.acceptQuote}</Button>}
    <Button loading={busy} disabled={busy||voucherLoading||!voucherReady||intentError||intentOwner!==owner||requote||(authenticated?!ready:!cartReady||quotePending||loadError||requoteState==="loading"||requoteState==="error"||(guestValid&&!ready))} onClick={()=>void submit()}>{copy.confirm}<Icon name="arrow" size={17}/></Button>
   </div>
   </StoreSection>
  </div>
 </div></main>;
}
