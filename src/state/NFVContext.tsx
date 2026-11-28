"use client";
import {createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction} from "react";
import type {AccountTab, Address, Backend, CatalogData, Locale, Resource, Screen, Order} from "@/types";
import {useAuth} from "@/auth/AuthProvider";
import {isUnauthorized} from "@/auth/auth-service";
import {isPublicAccessDenied} from "@/account/account-api";
import {localeFromPath,localScreenFromPath,navigationHrefForPage} from "@/data/main-navigation";
import {accountRouteState} from "@/lib/account-navigation";
import {syncBrowserRoute} from "@/lib/browser-navigation";
import * as rewardsService from "@/account/rewards-service";
import * as referralsService from "@/account/referrals-service";
import * as csaService from "@/account/csa-service";
import * as shippingService from "@/account/shipping-service";
import {ACCOUNT_SERVICE_RESOURCES,initialData,initialUI,recipientEmpty,type UIState} from "./initial-state";
import {loadBlockedStoreProducts,loadCart,loadCartProducts,saveBlockedStoreProducts,saveCart,saveCartProducts} from "./cart-persistence";
import type {StoreProductCard} from "@/store/store-model";
import {copyWithFeedback,type ToastTone} from "@/lib/copy-feedback";
import {mergeStoreProductSnapshots,type StoreProductSnapshot} from "@/store/store-product-snapshots";
import {createCartProductRefreshCoordinator} from "@/store/cart-product-refresh";
import {isStorePurchaseQuantity,STORE_MAX_ORDER_LINES} from "@/store/store-limits";
import {STORE_COPY} from "@/data/store-copy";

export {initialUI} from "./initial-state";
type Ctx = {
  cartHydrated:boolean; accountSessionKey:string;
  storeAvailability:Readonly<Record<string,number|null|undefined>>;
  data: CatalogData; setData: Dispatch<SetStateAction<CatalogData>>;
  ui: UIState; setUI: Dispatch<SetStateAction<UIState>>;
  patch: (update:Partial<UIState>)=>void; navigate:(page:Screen,opts?:{tab?:AccountTab;productId?:string;hub?:boolean;replace?:boolean})=>void;
  call: <T=unknown>(method:keyof Backend, arg?:unknown)=>Promise<T>;
  act: <T>(key:string, task:()=>Promise<T>, success?:string,onCurrentResult?:(result:T|undefined)=>void)=>Promise<T|undefined>;
  toast: (message:string,tone?:ToastTone)=>void; copyToClipboard:(value:string)=>Promise<boolean>; addCart:(product:StoreProductCard,quantity?:number,options?:{openCart?:boolean})=>void; cacheStoreProducts:(products:StoreProductCard[],source?:"catalog"|"verified")=>void;
  recheckStoreProducts:(products:StoreProductCard[])=>void;
  updateCart:(id:string,delta:number)=>void; acknowledgeCartProduct:(id:string)=>void; retryCartProduct:(id:string)=>void; markCartProductsUnavailable:(ids:readonly string[])=>void; beginCheckout:()=>void;
  loadWards:(province:string,force?:boolean)=>Promise<void>; refreshResource:(resource:Resource)=>Promise<void>;
};
const privateResource:Partial<Record<keyof Backend,Resource>>={
  getShippingAddress:"address",saveShippingAddress:"address",getCSA:"csa",getCsaUsagePage:"csa",
  getRewards:"rewards",getRewardHistoryPage:"rewards",redeemGift:"rewards",
  getReferrals:"referrals",getReferralsPage:"referrals",applyReferralCode:"referrals",
};
const actionResource:Readonly<Record<string,Resource>>={
  "save:address":"address","gift:redeem":"rewards","referral:apply":"referrals",
  "page:csa":"csa","page:referrals":"referrals","page:rewards":"rewards","page:redemptions":"rewards",
};
const Context=createContext<Ctx|null>(null);
const CATALOG_RECHECK_INTERVAL_MS=30_000;
function openCartForValidation(state:UIState):UIState {
  const loading=Object.keys(state.cart).map(id=>[id,"loading"] as const);
  return {...state,cartOpen:true,cartProductState:{...state.cartProductState,...Object.fromEntries(loading)}};
}
export function useNFV():Ctx {
  const ctx=useContext(Context);if(!ctx)throw Error("NFVProvider is required");return ctx;
}
export function NFVProvider({children,initialPage="home",initialLocale="vi",initialAccountTab="orders",initialAccountHubOpen=true,initialReferrerCode=""}:{children:ReactNode;initialPage?:Screen;initialLocale?:Locale;initialAccountTab?:AccountTab;initialAccountHubOpen?:boolean;initialReferrerCode?:string}){
  const auth=useAuth();
  const {expire}=auth;
  const [data,setData]=useState(initialData);
  const [ui,setUI]=useState<UIState>(()=>({...initialUI,page:initialPage,locale:initialLocale,accountTab:initialAccountTab,accountHubOpen:initialPage==="account"&&initialAccountHubOpen,referrerDraft:initialReferrerCode}));
  const [cartReady,setCartReady]=useState(false);
  const [storeAvailability,setStoreAvailability]=useState<Record<string,number|null|undefined>>({});
  const catalogRechecks=useRef(new Map<string,{stock:number;slug:string;time:number}>());
  const cartValidation=useRef<{locale:Locale;drawerOpen:boolean;slugs:Map<string,string|null>}|null>(null);
  const [accountSessionKey,setAccountSessionKey]=useState("checking");
  const [addressSession,setAddressSession]=useState<typeof auth.session>(null);
  // Synchronous guards prevent double submits before React has committed the pending state.
  const activeActions=useRef(new Map<string,number>());
  const wardRequests=useRef(new Map<string,Promise<void>>());
  const loadedWards=useRef(new Set<string>());
  const authEpoch=useRef(0);
  useLayoutEffect(()=>()=>{authEpoch.current+=1},[auth.status,auth.session]);
  const giftIntentOwner=useRef<string|null>(null);
  const resourceSequences=useRef(new Map<Resource,number>());
  const resourceRetirements=useRef(new Map<Resource,number>());
  const beginResourceRequest=useCallback((resource:Resource)=>{
    const sequence=(resourceSequences.current.get(resource)??0)+1,epoch=authEpoch.current;
    resourceSequences.current.set(resource,sequence);
    return ()=>epoch===authEpoch.current&&resourceSequences.current.get(resource)===sequence;
  },[]);
  const patch=useCallback((change:Partial<UIState>)=>setUI(s=>{
    const next={...s,...change};
    return change.cartOpen&&!s.cartOpen?openCartForValidation(next):next;
  }),[]);
  const toast=useCallback((message:string,tone:ToastTone="success")=>setUI(s=>({...s,toast:message,toastTone:tone,toastSequence:s.toastSequence+1})),[]);
  const copyToClipboard=useCallback((value:string)=>copyWithFeedback(value,ui.locale,toast),[ui.locale,toast]);
  const cartRefresh=useMemo(()=>createCartProductRefreshCoordinator({
    onState:(id,state)=>{
      if(state==="unavailable")setStoreAvailability(current=>({...current,[id]:null}));
      setUI(current=>current.cart[id]?{...current,cartProductState:{...current.cartProductState,[id]:state}}:current);
    },
    onReady:(id,product,notice)=>{
      const validation=cartValidation.current;
      if(validation?.slugs.has(id))validation.slugs.set(id,product.slug);
      setStoreAvailability(current=>({...current,[id]:product.available_quantity}));
      setData(current=>({...current,storeProducts:{...current.storeProducts,[id]:product}}));
      setUI(current=>{
        if(!current.cart[id])return current;
        const cartProductNotice={...current.cartProductNotice};
        if(notice)cartProductNotice[id]=notice;
        return {...current,cartProductState:{...current.cartProductState,[id]:"ready"},cartProductNotice};
      });
    },
  }),[]);
  useEffect(()=>{
    const cart=loadCart(window.sessionStorage),cached=loadCartProducts(window.sessionStorage) as Record<string,StoreProductSnapshot>;
    setData(state=>({...state,storeProducts:cached}));setUI(state=>({...state,cart,cartProductState:Object.fromEntries(Object.keys(cart).map(id=>[id,"loading"]))}));
    setStoreAvailability(loadBlockedStoreProducts(window.sessionStorage));
    setCartReady(true);
  },[]);
  useEffect(()=>{
    if(cartReady)saveCart(window.sessionStorage,ui.cart);
  },[cartReady,ui.cart]);
  useEffect(()=>{if(cartReady)saveCartProducts(window.sessionStorage,data.storeProducts)},[cartReady,data.storeProducts]);
  const wantsCartValidation=ui.cartOpen||ui.page==="checkout";
  useEffect(()=>{
    if(!cartReady||!wantsCartValidation){cartValidation.current=null;return}
    let validation=cartValidation.current;
    if(!validation||validation.locale!==ui.locale||ui.cartOpen&&!validation.drawerOpen){
      validation={locale:ui.locale,drawerOpen:ui.cartOpen,slugs:new Map()};
      cartValidation.current=validation;
    }
    validation.drawerOpen=ui.cartOpen;
    for(const id of validation.slugs.keys())if(!ui.cart[id])validation.slugs.delete(id);
    for(const id of Object.keys(ui.cart)){
      const cached=data.storeProducts[id];
      const slug=cached?.catalogSlug??cached?.slug??null;
      if(validation.slugs.get(id)===slug)continue;
      validation.slugs.set(id,slug);
      if(!cached){
        setUI(state=>({...state,cartProductState:{...state.cartProductState,[id]:"unavailable"}}));
        continue;
      }
      void cartRefresh.refresh({id,cached,locale:ui.locale},{reusePending:true});
    }
  },[cartReady,wantsCartValidation,ui.cartOpen,ui.locale,ui.cart,data.storeProducts,cartRefresh]);
  useEffect(()=>()=>{
    cartValidation.current=null;
    cartRefresh.cancelAll();
  },[cartRefresh]);
  useEffect(()=>{if(cartReady)saveBlockedStoreProducts(window.sessionStorage,storeAvailability)},[cartReady,storeAvailability]);
  useEffect(()=>{if(!ui.toast)return;const t=setTimeout(()=>patch({toast:""}),2200);return ()=>clearTimeout(t);},[ui.toast,ui.toastSequence,patch]);
  const retireResource=useCallback((resource:Resource)=>{
    resourceSequences.current.set(resource,(resourceSequences.current.get(resource)??0)+1);
    resourceRetirements.current.set(resource,(resourceRetirements.current.get(resource)??0)+1);
    setData(state=>resource==="address"?{...state,shippingAddress:null,addresses:[]}:{...state,[resource]:null});
    setUI(state=>({...state,accountFetchState:{...state.accountFetchState,[resource]:"error"},
      ...(resource==="address"?{addressEditing:false}:resource==="rewards"?{giftIntent:null}:{})}));
  },[]);
  const call=useCallback(async<T,>(method:keyof Backend,arg?:unknown):Promise<T>=>{
    const epoch=authEpoch.current;
    const resource=privateResource[method],sequence=resource&&resourceSequences.current.get(resource);
    try {
      if(method==="getRewards")return await rewardsService.getRewards(ui.locale) as T;
      if(method==="getRewardGiftsPage")return await rewardsService.getRewardGiftsPage({...(arg as {cursor?:string|null;limit?:number}),locale:ui.locale}) as T;
      if(method==="getRewardHistoryPage")return await rewardsService.getRewardHistoryPage({...(arg as {type:"points"|"redemptions";cursor?:string|null;limit?:number}),locale:ui.locale}) as T;
      if(method==="redeemGift")return await rewardsService.redeemGift({...(arg as {giftId:string;idempotencyKey:string}),locale:ui.locale}) as T;
      if(method==="getReferrals")return await referralsService.getReferrals() as T;
      if(method==="getReferralsPage")return await referralsService.getReferralsPage(arg as {cursor?:string|null;limit?:number}) as T;
      if(method==="applyReferralCode")return await referralsService.applyReferralCode(arg as {code:string}) as T;
      if(method==="getCSA")return await csaService.getCSA(ui.locale) as T;
      if(method==="getCsaUsagePage")return await csaService.getCsaUsagePage({...(arg as {cursor?:string|null;limit?:number}),locale:ui.locale}) as T;
      if(method==="getShippingAddress")return await shippingService.getShippingAddress(ui.locale) as T;
      if(method==="saveShippingAddress"){
        const address=arg as Address;
        return await shippingService.saveShippingAddress({name:address.name,phone:address.phone,provinceCode:address.provinceCode??"",provinceName:address.city,wardCode:address.wardCode??"",wardName:address.ward,address:address.detail}) as T;
      }
      const fn=typeof window!=="undefined" ? window.NFV_BACKEND?.[method] : undefined;
      if(typeof fn!=="function")throw new Error(ui.locale==="en"?`API is not connected: ${method}`:`Chưa kết nối API: ${method}`);
      return await (arg===undefined ? (fn as ()=>Promise<T>).call(window.NFV_BACKEND) : (fn as (a:unknown)=>Promise<T>).call(window.NFV_BACKEND,arg));
    }
    catch(error){
      if(epoch===authEpoch.current){
        if(isUnauthorized(error))expire();
        else if(resource&&resourceSequences.current.get(resource)===sequence&&isPublicAccessDenied(error))retireResource(resource);
      }
      throw error;
    }
  },[expire,retireResource,ui.locale]);
  const act=useCallback(async<T,>(key:string,task:()=>Promise<T>,success?:string,onCurrentResult?:(result:T|undefined)=>void):Promise<T|undefined>=>{
    const epoch=authEpoch.current;
    const resource=actionResource[key],accessRevision=resource&&resourceRetirements.current.get(resource);
    if(activeActions.current.get(key)===epoch)return undefined;
    activeActions.current.set(key,epoch);
    const current=()=>epoch===authEpoch.current&&activeActions.current.get(key)===epoch&&
      (!resource||resourceRetirements.current.get(resource)===accessRevision);
    setUI(s=>({...s,busyKeys:[...s.busyKeys.filter(item=>item!==key),key],error:""}));
    try {
      const result=await task();
      if(!current())return undefined;
      if(success)toast(success);
      // Ignored and duplicate actions never invoke UI completion handlers.
      onCurrentResult?.(result);
      return result;
    } catch(e) {
      if(current()){
        setUI(s=>({...s,error:e instanceof Error?e.message:(ui.locale==="en"?"Unable to complete the action. Please try again.":"Không thể thực hiện. Vui lòng thử lại.")}));
        onCurrentResult?.(undefined);
      }
      return undefined;
    } finally {
      // A late completion must not release a newer owner's action with the same key.
      if(activeActions.current.get(key)===epoch){
        activeActions.current.delete(key);
        if(epoch===authEpoch.current)setUI(s=>({...s,busyKeys:s.busyKeys.filter(item=>item!==key)}));
      }
    }
  },[toast,ui.locale]);
  const navigate=useCallback((page:Screen,opts?:{tab?:AccountTab;productId?:string;hub?:boolean;replace?:boolean})=>{
    // Only locally implemented screens own their own public URLs.
    if(typeof window!=="undefined"){
      const href=navigationHrefForPage(page,ui.locale,opts?.tab,opts?.productId);
      if(syncBrowserRoute(window,href,{replace:opts?.replace}))return;
    }
    setUI(s=>({...s,page,cartOpen:false,filterOpen:false,categoryOpen:false,
      accountTab:opts?.tab??(page==="account"?"orders":s.accountTab),
      accountHubOpen:opts?.hub??(page==="account"&&!opts?.tab),
      productId:opts?.productId??s.productId,detailQty:opts?.productId?1:s.detailQty,error:""}));
    if(typeof window!=="undefined")window.scrollTo({top:0,behavior:"instant"});
  },[ui.locale]);
  useEffect(()=>{
    const handlePopState=()=>{
      const page=localScreenFromPath(window.location.pathname);
      if(page)setUI(s=>({...s,page,locale:localeFromPath(window.location.pathname),
        accountHubOpen:page==="account",...accountRouteState(window.location),cartOpen:false,filterOpen:false,categoryOpen:false}));
    };
    window.addEventListener("popstate",handlePopState);
    return ()=>window.removeEventListener("popstate",handlePopState);
  },[]);
  const recheckStoreProducts=useCallback((products:StoreProductCard[])=>{
    if(wantsCartValidation)return;
    const now=Date.now();
    for(const product of products){
      const stock=storeAvailability[product.id];
      if(stock===undefined||stock===product.available_quantity)continue;
      const previous=catalogRechecks.current.get(product.id);
      if(previous?.stock===product.available_quantity&&previous.slug===product.slug&&now-previous.time<CATALOG_RECHECK_INTERVAL_MS)continue;
      catalogRechecks.current.set(product.id,{stock:product.available_quantity,slug:product.slug,time:now});
      const snapshot=data.storeProducts[product.id];
      const cached=snapshot&&snapshot.slug!==product.slug?{...snapshot,catalogSlug:product.slug}:snapshot??product;
      void cartRefresh.refresh({id:product.id,cached,locale:ui.locale},{reusePending:true});
    }
  },[cartRefresh,data.storeProducts,storeAvailability,ui.locale,wantsCartValidation]);
  const cacheStoreProducts=useCallback((products:StoreProductCard[],source:"catalog"|"verified"="catalog")=>{
    if(source==="verified"){
      for(const product of products)cartRefresh.cancel(product.id);
      setStoreAvailability(current=>({...current,...Object.fromEntries(products.map(product=>[product.id,product.available_quantity]))}));
      setUI(current=>({...current,cartProductState:{...current.cartProductState,...Object.fromEntries(products.filter(product=>current.cart[product.id]).map(product=>[product.id,"ready" as const]))}}));
    }else{
      const renamed=products.filter(product=>{
        const cached=data.storeProducts[product.id];
        return ui.cart[product.id]&&cached&&cached.slug!==product.slug&&cached.catalogSlug!==product.slug;
      });
      if(renamed.length){
        for(const product of renamed)cartRefresh.cancel(product.id);
        setUI(current=>({...current,cartProductState:{...current.cartProductState,...Object.fromEntries(renamed.map(product=>[product.id,"loading" as const]))}}));
      }
      recheckStoreProducts(products);
    }
    setData(state=>({...state,storeProducts:mergeStoreProductSnapshots(state.storeProducts,products,ui.cart,source)}));
  },[cartRefresh,data.storeProducts,recheckStoreProducts,ui.cart]);
  const markCartProductsUnavailable=useCallback((ids:readonly string[])=>{
    for(const id of ids)cartRefresh.cancel(id);
    setStoreAvailability(current=>({...current,...Object.fromEntries(ids.map(id=>[id,null]))}));
    setUI(state=>{
      const cartProductState={...state.cartProductState},cartProductNotice={...state.cartProductNotice};
      for(const id of ids)if(state.cart[id]){cartProductState[id]="unavailable";delete cartProductNotice[id]}
      return {...state,cartProductState,cartProductNotice};
    });
  },[cartRefresh]);
  const addCart=useCallback((product:StoreProductCard,quantity=1,{openCart=true}:{openCart?:boolean}={})=>{
    const verified=storeAvailability[product.id];
    if(verified===null){toast(ui.locale==="en"?"Product is no longer available":"Sản phẩm không còn bán","error");return}
    const available=verified??product.available_quantity;
    if(available<=0){toast(ui.locale==="en"?"This product is out of stock.":"Sản phẩm hiện đã hết hàng.","error");return}
    setData(state=>({...state,storeProducts:mergeStoreProductSnapshots(state.storeProducts,[product],ui.cart)}));
    setUI(s=>{
      const toastSequence=s.toastSequence+1,count=s.cart[product.id]??0;
      if(!count&&Object.keys(s.cart).length>=STORE_MAX_ORDER_LINES){
        const next={...s,toastSequence,toastTone:"error" as const,toast:ui.locale==="en"?`Your cart can contain up to ${STORE_MAX_ORDER_LINES} different products.`:`Giỏ hàng tối đa ${STORE_MAX_ORDER_LINES} sản phẩm khác nhau.`};
        return openCart&&!s.cartOpen?openCartForValidation(next):next;
      }
      const nextCount=count+quantity;
      if(!isStorePurchaseQuantity(quantity,available)||!isStorePurchaseQuantity(nextCount,available)){
        const next:UIState={...s,toastSequence,toastTone:"error",toast:STORE_COPY[ui.locale].cannotAddQuantity};
        return openCart&&!s.cartOpen?openCartForValidation(next):next;
      }
      const cartProductNotice={...s.cartProductNotice};
      if(!count)delete cartProductNotice[product.id];
      const next:UIState={...s,
        cart:{...s.cart,[product.id]:nextCount},
        cartProductState:{...s.cartProductState,[product.id]:count?s.cartProductState[product.id]:"loading"},
        cartProductNotice,toastSequence,toastTone:"success",toast:ui.locale==="en"?"Added to cart":"Đã thêm vào giỏ",
      };
      return openCart&&!s.cartOpen?openCartForValidation(next):next;
    });
  },[storeAvailability,ui.cart,toast,ui.locale]);
  const updateCart=useCallback((id:string,delta:number)=>{
    if(!Number.isSafeInteger(delta)||delta===0)return;
    const count=ui.cart[id];
    if(count&&count+delta<=0)cartRefresh.cancel(id);
    const verified=storeAvailability[id];
    const available=verified===undefined?data.storeProducts[id]?.available_quantity:verified;
    setUI(s=>{
      const current=s.cart[id];
      if(!current)return s;
      const next=current+delta;
      if(delta>0&&(s.cartProductState[id]!=="ready"||!isStorePurchaseQuantity(next,available)))return s;
      if(next>0)return {...s,cart:{...s.cart,[id]:next}};
      const cart={...s.cart},applyCSA={...s.applyCSA},cartProductNotice={...s.cartProductNotice},cartProductState={...s.cartProductState};
      delete cart[id];delete applyCSA[id];delete cartProductNotice[id];delete cartProductState[id];
      return {...s,cart,applyCSA,cartProductNotice,cartProductState};
    });
  },[cartRefresh,data.storeProducts,storeAvailability,ui.cart]);
  const acknowledgeCartProduct=useCallback((id:string)=>setUI(s=>{const cartProductNotice={...s.cartProductNotice};delete cartProductNotice[id];return {...s,cartProductNotice}}),[]);
  const retryCartProduct=useCallback((id:string)=>{
    const cached=data.storeProducts[id];
    if(!cached||!ui.cart[id]){
      setUI(state=>({...state,cartProductState:{...state.cartProductState,[id]:"unavailable"}}));
      return;
    }
    void cartRefresh.refresh({id,cached,locale:ui.locale});
  },[cartRefresh,data.storeProducts,ui.cart,ui.locale]);
  const beginCheckout=useCallback(()=>{
    setUI(s=>({...s,page:"checkout",cartOpen:false,applyCSA:{}}));
    if(typeof window!=="undefined")syncBrowserRoute(window,navigationHrefForPage("checkout",ui.locale)??`/store/checkout/${ui.locale}`);
    window.scrollTo({top:0,behavior:"instant"});
  },[ui.locale]);
  const loadWards=useCallback((province:string,force=false):Promise<void>=>{
    if(!province)return Promise.resolve();
    const existing=wardRequests.current.get(province);
    if(existing)return existing;
    if(loadedWards.current.has(province)&&!force)return Promise.resolve();

    setUI(s=>({...s,wardFetchState:{...s.wardFetchState,[province]:"loading"}}));
    const request=Promise.resolve().then(async()=>{
      try {
        const backend=window.NFV_BACKEND;
        if(!backend?.getProvinces||!backend.getWards)throw new Error("Chưa kết nối dữ liệu địa chỉ.");
        const provinces=await backend.getProvinces();
        const code=Array.isArray(provinces)?provinces.find(row=>row?.name===province)?.code:null;
        if(!code)throw new Error("Không tìm thấy tỉnh/thành phố.");
        const rows=await backend.getWards(String(code));
        if(!Array.isArray(rows))throw new Error("Dữ liệu xã/phường không hợp lệ.");
        const wards=rows.filter(row=>typeof row?.name==="string"&&row.name.trim()).map(row=>row.name as string);
        setData(s=>({...s,wards:{...s.wards,[province]:wards}}));
        loadedWards.current.add(province);
        setUI(s=>({...s,wardFetchState:{...s.wardFetchState,[province]:"ready"}}));
      } catch {
        // A failed request is not an empty list: keep the retry action available.
        setUI(s=>({...s,wardFetchState:{...s.wardFetchState,[province]:"error"}}));
      } finally {
        wardRequests.current.delete(province);
      }
    });
    wardRequests.current.set(province,request);
    return request;
  },[]);
  const refreshResource=useCallback(async(resource:Resource)=>{
    if(!data.authenticated)return;
    const current=beginResourceRequest(resource);
    if(resource==="address"){
      setUI(s=>({...s,accountFetchState:{...s.accountFetchState,address:"loading"}}));
      try{
        const value=await call<Address|null>("getShippingAddress");
        if(!current())return;
        setData(s=>({...s,shippingAddress:value}));
        setUI(s=>({...s,accountFetchState:{...s.accountFetchState,address:"ready"}}));
      }catch{
        if(current())setUI(s=>({...s,accountFetchState:{...s.accountFetchState,address:"error"}}));
      }
      return;
    }
    const name=({csa:"getCSA",rewards:"getRewards",referrals:"getReferrals"} as const)[resource];
    if(!["csa","rewards","referrals"].includes(resource)&&!window.NFV_BACKEND?.[name])return;
    setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[resource]:"loading"}}));
    try {
      const value=await call(name);
      if(!current())return;
      setData(s=>({...s,[resource]:value}));
      setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[resource]:"ready"}}));
    } catch {
      if(current())setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[resource]:"error"}}));
    }
  },[beginResourceRequest,call,data.authenticated]);
  // Address lookup data is public and does not depend on the customer's session.
  useEffect(()=>{
    let active=true;
    const backend=window.NFV_BACKEND;
    if(!backend)return;
    const safe=async<T,>(key:keyof Backend,apply:(value:T)=>void)=>{
      if(typeof backend[key]!=="function")return;
      try{const value=await call<T>(key);if(active)apply(value);}
      catch(error){console.error("NFV public data:",key,error);}
    };
    void Promise.all([
      safe<{code:string;name:string}[]>("getProvinces",value=>setData(s=>({...s,provinces:Array.isArray(value)?value.filter(x=>x?.code&&x?.name).map(x=>x.name):[]})))
    ]);
    return ()=>{active=false;};
  },[call]);

  // One session owner (AuthProvider); reload private resources whenever it changes.
  useEffect(()=>{
    const epoch=++authEpoch.current;
    if(auth.status!=="checking"){
      const owner=auth.status==="authenticated"?auth.session?.subject??null:null;
      if(giftIntentOwner.current!==owner){
        const previousOwner=giftIntentOwner.current;
        giftIntentOwner.current=owner;
        setUI(s=>({...s,giftIntent:null,...(previousOwner?{referrerDraft:"",referrerError:"",addressEditing:false,visible:{}}:{})}));
      }
    }
    setUI(s=>({...s,busyKeys:[],error:""}));
    let active=true;
    const stillCurrent=()=>active&&epoch===authEpoch.current;
    if(auth.status!=="authenticated"){
      if(auth.status!=="checking"){
        setAccountSessionKey(auth.status);
        setData(s=>({...s,authenticated:false,hasCSA:false,profile:{name:"",phone:"",email:"",dateOfBirth:null},
          addresses:[],shippingAddress:null,orders:[],csa:null,rewards:null,referrals:null}));
        setUI(s=>({...s,recipient:{...recipientEmpty},accountFetchState:{},applyCSA:{},
          couponCode:"",couponAmount:0,couponDraft:"",addressEditing:false,
          giftIntent:null,referrerDraft:"",referrerError:"",visible:{}}));
      }
      return ()=>{active=false;};
    }
    setAccountSessionKey(auth.session?.subject??"");
    setAddressSession(auth.session);
    setData(s=>({...s,authenticated:true,hasCSA:!!auth.session?.hasCSA,
      profile:{name:"",phone:"",email:"",dateOfBirth:null,...auth.session?.profile},
      addresses:[],shippingAddress:null,orders:[],csa:null,rewards:null,referrals:null}));
    setUI(s=>({...s,accountFetchState:{...s.accountFetchState,address:"loading"}}));
    const backend=window.NFV_BACKEND;
    const safe=async<T,>(method:keyof Backend,apply:(value:T)=>void)=>{
      if(typeof backend?.[method]!=="function")return;
      try{const value=await call<T>(method);if(stillCurrent())apply(value);}
      catch(error){if(stillCurrent())console.error("NFV account data:",method,error);}
    };
    const addressCurrent=beginResourceRequest("address");
    void Promise.all([
      call<Address|null>("getShippingAddress").then(v=>{if(stillCurrent()&&addressCurrent()){
        setData(s=>({...s,shippingAddress:v}));
        setUI(s=>({...s,accountFetchState:{...s.accountFetchState,address:"ready"}}));
      }}).catch(()=>{if(stillCurrent()&&addressCurrent())setUI(s=>({...s,accountFetchState:{...s.accountFetchState,address:"error"}}));}),
      safe<Address|null>("getAddress",v=>setData(s=>({...s,addresses:v?[v]:[]}))),
      safe<Order[]>("getOrders",v=>setData(s=>({...s,orders:Array.isArray(v)?v:[]}))),
      ...ACCOUNT_SERVICE_RESOURCES.map(kind=>{
        const method=({csa:"getCSA",rewards:"getRewards",referrals:"getReferrals"} as const)[kind];
        const current=beginResourceRequest(kind);
        setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[kind]:"loading"}}));
        return call(method).then(v=>{if(stillCurrent()&&current()){
          setData(s=>({...s,[kind]:v}));
          setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[kind]:"ready"}}));
        }}).catch(()=>{if(stillCurrent()&&current())setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[kind]:"error"}}));});
      })
    ]);
    return ()=>{active=false;};
  },[auth.status,auth.session,beginResourceRequest,call,ui.locale]);
  // The old address can still be in React state before the new session effect runs.
  const visibleUI=useMemo(()=>auth.status==="authenticated"&&addressSession!==auth.session
    ? {...ui,accountFetchState:{...ui.accountFetchState,address:"loading" as const}} : ui,[ui,auth.status,auth.session,addressSession]);
  const value=useMemo(()=>({cartHydrated:cartReady,accountSessionKey,storeAvailability,data,setData,ui:visibleUI,setUI,patch,navigate,call,act,toast,copyToClipboard,addCart,cacheStoreProducts,recheckStoreProducts,updateCart,acknowledgeCartProduct,retryCartProduct,markCartProductsUnavailable,beginCheckout,loadWards,refreshResource}),
    [cartReady,accountSessionKey,storeAvailability,data,visibleUI,patch,navigate,call,act,toast,copyToClipboard,addCart,cacheStoreProducts,recheckStoreProducts,updateCart,acknowledgeCartProduct,retryCartProduct,markCartProductsUnavailable,beginCheckout,loadWards,refreshResource]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
