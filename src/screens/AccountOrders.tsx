"use client";
import {useEffect,useRef,useState} from "react";
import {Button,DataState,FormInput,Tabs,Status,Photo} from "@/components/UI";
import {ListPaginationFooter} from "@/components/account/ListPaginationFooter";
import {StoreSection} from "@/components/store/StorePrimitives";
import {useNFV} from "@/state/NFVContext";
import {useAuth} from "@/auth/AuthProvider";
import {useStoreSession} from "@/store/use-store-session";
import {currentLookupStoreOrder,getStoreOrders,lookupStoreOrder} from "@/store/store-order-service";
import type {StoreOrder,StoreOrderStatus} from "@/store/store-order-model";
import {StoreOrderDetail,STORE_STATUS} from "@/screens/store/StoreOrderDetail";
import {money} from "@/lib/format";
import {formatUnitSize} from "@/store/store-format";
import {sanitizeVietnamPhoneInput} from "@/account/shipping-address-model";
import {readOrdersView,saveOrdersView} from "@/account/orders-view-state";
import {AccountApiError} from "@/account/account-api";

const C={vi:{title:"Đơn hàng nông sản",loading:"Đang tải đơn hàng…",failed:"Không thể tải đơn hàng",empty:"Chưa có đơn hàng",retry:"Thử lại",all:"Tất cả",previous:"Trước",next:"Sau",view:"Xem chi tiết",placed:"Đặt ngày",total:"Tổng thanh toán",lookup:"Kiểm tra đơn hàng",lookupIntro:"Nhập mã đơn và số điện thoại đã dùng khi đặt. Không cần đăng nhập.",reference:"Mã đơn",phone:"Số điện thoại",find:"Tra cứu",notFound:"Không tìm thấy đơn hàng với thông tin này.",limited:"Bạn đã thử quá nhiều lần. Vui lòng chờ rồi thử lại.",stale:"Chưa cập nhật được đơn hàng. Đang hiển thị dữ liệu lần tải trước.",session:"Phiên tra cứu đã hết hạn. Hãy nhập lại mã đơn và số điện thoại."},en:{title:"Produce orders",loading:"Loading orders…",failed:"Orders could not be loaded",empty:"No orders yet",retry:"Try again",all:"All",previous:"Previous",next:"Next",view:"View details",placed:"Placed on",total:"Total payment",lookup:"Check an order",lookupIntro:"Enter the order code and phone number used at checkout. No sign-in is required.",reference:"Order code",phone:"Phone number",find:"Look up",notFound:"No order was found with this information.",limited:"Too many attempts. Wait before trying again.",stale:"Orders could not be refreshed. Showing the previously loaded data.",session:"The lookup session expired. Enter the order code and phone number again."}};
const STATUSES:StoreOrderStatus[]=["payment_pending","pending_review","pending_delivery","delivered","cancelled"];
function ordersVisible(active:boolean,hubOpen:boolean){
 return active&&!(hubOpen&&typeof window!=="undefined"&&typeof window.matchMedia==="function"&&window.matchMedia("(max-width: 1023px)").matches);
}
export function OrdersView({active=true}:{active?:boolean}={}){
 const storeRequest=useStoreSession();
 const {ui,navigate}=useNFV(),copy=C[ui.locale],auth=useAuth();
 const owner=auth.status==="authenticated"?auth.session?.subject??"":auth.status;
 const [resultOwner,setResultOwner]=useState(owner);
 const [items,setItems]=useState<StoreOrder[]>([]),[page,setPage]=useState(1),[total,setTotal]=useState(0),[status,setStatus]=useState<StoreOrderStatus|undefined>(),[state,setState]=useState("loading");
 const seq=useRef(0),queryOwner=useRef(owner),request=useRef<number|null>(null);
 const previousActive=useRef({owner,active});
 const restoredOwner=useRef<string|null>(null),restorePages=useRef(1);
 const [refreshError,setRefreshError]=useState(false);
 const cache=useRef(new Map<string,{items:StoreOrder[];total:number;page:number;receivedAt:number}>());
 const cacheKey=(filter:StoreOrderStatus|undefined)=>JSON.stringify([owner,filter??"all"]);
 const cachedFor=(filter:StoreOrderStatus|undefined)=>{
  const all=cache.current.get(cacheKey(undefined)),saved=cache.current.get(cacheKey(filter));
  if(filter&&all&&Date.now()-all.receivedAt<60000&&all.items.length>=all.total){const filtered=all.items.filter(order=>order.status===filter);return {items:filtered,total:filtered.length,page:1,receivedAt:all.receivedAt}}
  return saved&&Date.now()-saved.receivedAt<60000?saved:undefined;
 };
 const load=async()=>{
  const current=++seq.current;request.current=current;
  try{
   const result=await storeRequest(()=>getStoreOrders({page,status}));
   if(current!==seq.current)return;
   const previous=cache.current.get(cacheKey(status))?.items??[];
   const next=page===1?[...result.items]:[...previous,...result.items.filter(item=>!previous.some(existing=>existing.id===item.id))];
   const lastPage=page===1?Math.min(restorePages.current,Math.max(1,Math.ceil(result.meta.total/20))):page;
   const known=new Set(next.map(item=>item.id));
   for(let index=2;page===1&&index<=lastPage;index++){
    const following=await storeRequest(()=>getStoreOrders({page:index,status}));
    if(current!==seq.current)return;
    for(const item of following.items)if(!known.has(item.id)){next.push(item);known.add(item.id)}
   }
   restorePages.current=1;
   cache.current.set(cacheKey(status),{items:next,total:result.meta.total,page:lastPage,receivedAt:Date.now()});
   setItems(next);setTotal(result.meta.total);setPage(lastPage);setResultOwner(owner);setState("ready");setRefreshError(false);
  }catch{if(current===seq.current){setResultOwner(owner);setState(page===1?"error":"more_error")}}
  finally{if(request.current===current)request.current=null}
 };
 const refresh=async()=>{
  const saved=cache.current.get(cacheKey(status));
  if(!ordersVisible(active,ui.accountHubOpen)||auth.status!=="authenticated"||request.current!==null||!saved||document.visibilityState==="hidden")return;
  const current=++seq.current;request.current=current;
  try{
   const first=await storeRequest(()=>getStoreOrders({page:1,status}));
   if(current!==seq.current)return;
   const loadedPages=Math.max(saved.page,Math.ceil(saved.items.length/20));
   const lastPage=Math.min(loadedPages,Math.max(1,Math.ceil(first.meta.total/20)));
   const next=[...first.items],known=new Set(next.map(item=>item.id));
   for(let index=2;index<=lastPage;index++){
    const result=await storeRequest(()=>getStoreOrders({page:index,status}));
    if(current!==seq.current)return;
    for(const item of result.items)if(!known.has(item.id)){next.push(item);known.add(item.id)}
   }
   // A refreshed status can invalidate every filter projection. Publish loaded pages together.
   cache.current.clear();cache.current.set(cacheKey(status),{items:next,total:first.meta.total,page:lastPage,receivedAt:Date.now()});
   setItems(next);setTotal(first.meta.total);setPage(lastPage);setResultOwner(owner);setState("ready");setRefreshError(false);
  }catch{if(current===seq.current)setRefreshError(true)}
  finally{if(request.current===current)request.current=null}
 };
 const selectStatus=(next:StoreOrderStatus|undefined)=>{if(next===status)return;restorePages.current=1;seq.current+=1;request.current=null;const saved=cachedFor(next);if(saved)cache.current.set(cacheKey(next),saved);setStatus(next);setPage(saved?.page??1);setItems(saved?.items??[]);setTotal(saved?.total??0);setResultOwner(owner);setState(saved?"ready":"loading");setRefreshError(false)};
 // Each filter owns its request; complete All results can answer a filter locally.
 /* eslint-disable react-hooks/set-state-in-effect -- Reconcile persisted preferences and the current filter cache before loading. */
 useEffect(()=>{
  if(queryOwner.current!==owner){queryOwner.current=owner;cache.current.clear();setItems([]);setRefreshError(false);}
  if(auth.status!=="authenticated")return;
  if(restoredOwner.current!==owner){
   restoredOwner.current=owner;
   const saved=readOrdersView(owner);
   restorePages.current=saved?.page??1;
   if(status!==saved?.status||page!==1){setStatus(saved?.status);setPage(1);return;}
  }
  const saved=cachedFor(status);
  if(saved&&saved.page===page){cache.current.set(cacheKey(status),saved);setItems(saved.items);setTotal(saved.total);setResultOwner(owner);setState("ready");}
  else{setState(page===1?"loading":"loading_more");void load();}
  return()=>{seq.current+=1;request.current=null;};
 // eslint-disable-next-line react-hooks/exhaustive-deps -- The owner/filter/page identify this request; snapshot helpers must not restart it.
 },[page,status,owner]);
 /* eslint-enable react-hooks/set-state-in-effect */
 useEffect(()=>{
  if(auth.status==="authenticated"&&resultOwner===owner&&state==="ready")saveOrdersView(owner,{status,page});
 },[auth.status,resultOwner,owner,state,status,page]);
 useEffect(()=>{
  const visible=ordersVisible(active,ui.accountHubOpen);
  const previous=previousActive.current;previousActive.current={owner,active:visible};
  if(!visible||auth.status!=="authenticated"||typeof window==="undefined")return;
  if(previous.owner===owner&&!previous.active)void refresh();
  const onFocus=()=>{void refresh()};
  window.addEventListener("focus",onFocus);
  return()=>window.removeEventListener("focus",onFocus);
  // The current filter/page owns the listener; snapshot updates must not restart requests.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active,owner,page,status,ui.accountHubOpen]);
 const viewState=resultOwner===owner&&auth.status==="authenticated"?state:"loading";
 return <StoreSection title={copy.title} className="store-commerce store-orders"><Tabs label={copy.title} value={status??"all"} items={[{value:"all",label:copy.all},...STATUSES.map(value=>({value,label:STORE_STATUS[value][ui.locale]}))]} onChange={value=>selectStatus(value==="all"?undefined:value as StoreOrderStatus)}/>{refreshError&&<DataState compact kind="error" title={copy.stale} action={{label:copy.retry,onClick:()=>void refresh()}}/>}{viewState==="loading"?<DataState kind="loading" title={copy.loading}/>:viewState==="error"?<DataState kind="error" title={copy.failed} action={{label:copy.retry,onClick:()=>{setState("loading");void load()}}}/>:items.length?<><div className="store-order-list">{items.map(order=><article className="store-order-card" key={order.id} aria-labelledby={`store-order-${order.id}`}>
 <a className="store-order-card-link" href={`/store/orders/${order.id}/${ui.locale}`} aria-label={`${copy.view} ${order.referenceCode}`} onClick={event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate("order-detail",{productId:order.id,tab:"orders"})}}>
 <div className="store-order-top">
  <div className="store-order-identity"><h3 className="store-order-id" id={`store-order-${order.id}`}>{order.referenceCode}</h3><span className="store-order-date">{copy.placed} <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleDateString(ui.locale,{day:"2-digit",month:"2-digit",year:"numeric"})}</time></span></div>
  <Status status={order.status==="payment_pending"||order.status==="pending_review"?"pending":order.status==="cancelled"?"cancelled":"confirmed"} label={STORE_STATUS[order.status][ui.locale]}/>
 </div>
 <div className="store-order-body"><ul className="store-order-preview" aria-label={ui.locale==="vi"?"Sản phẩm trong đơn":"Order products"}>{order.lines.map(line=><li key={line.id}><span className="store-product-image"><Photo src={line.imageUrl??undefined} alt={line.name} locale={ui.locale}/></span><div><strong>{line.name}</strong><span>{line.quantity} × {formatUnitSize(line.unitSize)} {line.unitLabel}</span></div></li>)}</ul></div>
 <div className="store-order-footer">
  <div className="store-order-total-group"><span>{copy.total}</span><strong className="price store-order-total">{money(order.totalVnd)}</strong></div>
 </div>
 </a>
 </article>)}</div><ListPaginationFooter locale={ui.locale} shown={items.length} total={total} hasMore={items.length<total||state==="more_error"} pageSize={20} pending={state==="loading_more"} failed={state==="more_error"} onMore={()=>{if(state==="loading_more")return;setState("loading_more");if(state==="more_error")void load();else setPage(page+1)}}/></>:<DataState title={copy.empty}/>}</StoreSection>;
}
export function OrderDetail(){const {ui}=useNFV();return <main className="main-content"><StoreOrderDetail id={ui.productId} locale={ui.locale} returnTo={ui.accountTab==="csa"?"csa":"orders"}/></main>}
export function GuestOrderLookup(){
 const {ui}=useNFV(),copy=C[ui.locale];
 const [reference,setReference]=useState(""),[phone,setPhone]=useState(""),[order,setOrder]=useState<StoreOrder|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const sequence=useRef(0),submitting=useRef(false);
 useEffect(()=>{const request=++sequence.current;currentLookupStoreOrder().then(value=>{if(request===sequence.current)setOrder(value)}).catch(()=>{});return()=>{sequence.current+=1}},[]);
 const submit=async(event:React.FormEvent)=>{
  event.preventDefault();if(!reference.trim()||!phone.trim()||submitting.current)return;
  const request=++sequence.current;submitting.current=true;setBusy(true);setError("");
  try{const value=await lookupStoreOrder(reference.trim().toUpperCase(),phone);if(request===sequence.current)setOrder(value)}
  catch(reason){if(request===sequence.current){setOrder(null);setError(reason instanceof AccountApiError&&reason.status===429?copy.limited:reason instanceof AccountApiError&&reason.status===404?copy.notFound:copy.failed)}}
  finally{if(request===sequence.current){submitting.current=false;setBusy(false)}}
 };
 if(order)return <section className="account-guest-order-result"><Button variant="outline" onClick={()=>{sequence.current+=1;setOrder(null)}}>{copy.lookup}</Button><StoreOrderDetail key={order.id} id={order.id} locale={ui.locale} initialOrder={order} onLoaded={setOrder} loadOrder={()=>currentLookupStoreOrder()} readOnly/></section>;
 return <StoreSection title={copy.lookup} className="store-commerce account-order-lookup"><p>{copy.lookupIntro}</p><form className="form-grid" onSubmit={submit}><div><label className="label" htmlFor="guestOrderReference">{copy.reference}</label><FormInput id="guestOrderReference" maxLength={24} autoComplete="off" value={reference} onChange={event=>setReference(event.target.value.toUpperCase())}/></div><div><label className="label" htmlFor="guestOrderPhone">{copy.phone}</label><FormInput id="guestOrderPhone" autoComplete="tel" value={phone} onChange={event=>setPhone(sanitizeVietnamPhoneInput(event.target.value))}/></div><div className="wide"><Button type="submit" loading={busy} disabled={busy||!reference.trim()||!phone.trim()}>{copy.find}</Button></div></form>{error&&<p className="help-error" role="alert">{error}</p>}</StoreSection>;
}
