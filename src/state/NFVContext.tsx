"use client";
import {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction} from "react";
import type {AccountTab, Address, Backend, CatalogData, Category, Locale, Product, Resource, Screen, Order} from "@/types";
import {formatAddress} from "@/lib/format";
import {useAuth} from "@/auth/AuthProvider";
import {isUnauthorized} from "@/auth/auth-service";
import {localeFromPath,localScreenFromPath,navigationItemForPage,mainNavHref} from "@/data/main-navigation";
import {syncBrowserRoute} from "@/lib/browser-navigation";
import * as rewardsService from "@/account/rewards-service";
import * as referralsService from "@/account/referrals-service";
import {initialData,initialUI,recipientEmpty,type UIState} from "./initial-state";
import {loadCart,saveCart} from "./cart-persistence";

export {initialUI} from "./initial-state";
type Ctx = {
  data: CatalogData; setData: Dispatch<SetStateAction<CatalogData>>;
  ui: UIState; setUI: Dispatch<SetStateAction<UIState>>;
  patch: (update:Partial<UIState>)=>void; navigate:(page:Screen,opts?:{tab?:AccountTab;productId?:string;hub?:boolean;replace?:boolean})=>void;
  call: <T=unknown>(method:keyof Backend, arg?:unknown)=>Promise<T>;
  act: <T>(key:string, task:()=>Promise<T>, success?:string)=>Promise<T|undefined>;
  toast: (message:string)=>void; addCart:(id:string,quantity?:number)=>void;
  updateCart:(id:string,delta:number)=>void; beginCheckout:()=>void;
  loadWards:(province:string,force?:boolean)=>Promise<void>; refreshResource:(resource:Resource)=>Promise<void>;
};
const Context=createContext<Ctx|null>(null);
export function useNFV():Ctx {
  const ctx=useContext(Context);if(!ctx)throw Error("NFVProvider is required");return ctx;
}
function normalizeProducts(items:unknown):Product[] {
  if(!Array.isArray(items))return [];
  return items.filter(p=>p && /^[A-Za-z0-9_-]{1,100}$/.test(String(p.id??"")) && Number.isFinite(Number(p.price)) && Number(p.price)>=0)
    .map(p=>({...p,id:String(p.id),name:String(p.name||""),en:String(p.en||""),cat:String(p.cat||""),
      categoryId:String(p.categoryId??p.category_id??""),unit:String(p.unit||""),farm:String(p.farm||""),
      description:String(p.description||""),note:String(p.note||""),image:String(p.image||""),price:Number(p.price),csa:!!p.csa}));
}
export function NFVProvider({children,initialPage="home",initialLocale="vi",initialAccountTab="orders",initialAccountHubOpen=true,initialReferrerCode=""}:{children:ReactNode;initialPage?:Screen;initialLocale?:Locale;initialAccountTab?:AccountTab;initialAccountHubOpen?:boolean;initialReferrerCode?:string}){
  const auth=useAuth();
  const {expire}=auth;
  const [data,setData]=useState(initialData);
  const [ui,setUI]=useState<UIState>(()=>({...initialUI,page:initialPage,locale:initialLocale,accountTab:initialAccountTab,accountHubOpen:initialPage==="account"&&initialAccountHubOpen,referrerDraft:initialReferrerCode}));
  const [cartReady,setCartReady]=useState(false);
  // Synchronous guards prevent double submits before React has committed the pending state.
  const activeActions=useRef(new Set<string>());
  const wardRequests=useRef(new Map<string,Promise<void>>());
  const loadedWards=useRef(new Set<string>());
  const authEpoch=useRef(0);
  const patch=useCallback((change:Partial<UIState>)=>setUI(s=>({...s,...change})),[]);
  const toast=useCallback((message:string)=>setUI(s=>({...s,toast:message})),[]);
  useEffect(()=>{
    setUI(state=>({...state,cart:loadCart(window.sessionStorage)}));
    setCartReady(true);
  },[]);
  useEffect(()=>{
    if(cartReady)saveCart(window.sessionStorage,ui.cart);
  },[cartReady,ui.cart]);
  useEffect(()=>{if(!ui.toast)return;const t=setTimeout(()=>patch({toast:""}),2200);return ()=>clearTimeout(t);},[ui.toast,patch]);
  const call=useCallback(async<T,>(method:keyof Backend,arg?:unknown):Promise<T>=>{
    try {
      if(method==="getRewards")return await rewardsService.getRewards(ui.locale) as T;
      if(method==="getRewardGiftsPage")return await rewardsService.getRewardGiftsPage({...(arg as {cursor?:string|null;limit?:number}),locale:ui.locale}) as T;
      if(method==="getRewardHistoryPage")return await rewardsService.getRewardHistoryPage({...(arg as {type:"points"|"redemptions";cursor?:string|null;limit?:number}),locale:ui.locale}) as T;
      if(method==="redeemGift")return await rewardsService.redeemGift({...(arg as {giftId:string;idempotencyKey:string}),locale:ui.locale}) as T;
      if(method==="getReferrals")return await referralsService.getReferrals() as T;
      if(method==="getReferralsPage")return await referralsService.getReferralsPage(arg as {cursor?:string|null;limit?:number}) as T;
      if(method==="applyReferralCode")return await referralsService.applyReferralCode(arg as {code:string}) as T;
      const fn=typeof window!=="undefined" ? window.NFV_BACKEND?.[method] : undefined;
      if(typeof fn!=="function")throw new Error(`Chưa kết nối API: ${method}`);
      return await (arg===undefined ? (fn as ()=>Promise<T>).call(window.NFV_BACKEND) : (fn as (a:unknown)=>Promise<T>).call(window.NFV_BACKEND,arg));
    }
    catch(error){if(isUnauthorized(error))expire();throw error;}
  },[expire,ui.locale]);
  const act=useCallback(async<T,>(key:string,task:()=>Promise<T>,success?:string):Promise<T|undefined>=>{
    if(activeActions.current.has(key))return undefined;
    activeActions.current.add(key);
    setUI(s=>({...s,busyKeys:[...s.busyKeys,key],error:""}));
    try {
      const result=await task();
      if(success)toast(success);
      return result;
    } catch (e) {
      setUI(s=>({...s,error:e instanceof Error?e.message:"Không thể thực hiện. Vui lòng thử lại."}));
      return undefined;
    } finally {
      activeActions.current.delete(key);
      setUI(s=>({...s,busyKeys:s.busyKeys.filter(item=>item!==key)}));
    }
  },[toast]);
  const navigate=useCallback((page:Screen,opts?:{tab?:AccountTab;productId?:string;hub?:boolean;replace?:boolean})=>{
    // Only locally implemented screens own their own public URLs.
    if(typeof window!=="undefined"){
      const item=navigationItemForPage(page);
      const href=item?mainNavHref(item,ui.locale):null;
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
        accountHubOpen:page==="account",cartOpen:false,filterOpen:false,categoryOpen:false}));
    };
    window.addEventListener("popstate",handlePopState);
    return ()=>window.removeEventListener("popstate",handlePopState);
  },[]);
  const addCart=useCallback((id:string,quantity=1)=>{
    if(!data.products.some(p=>p.id===id))return;
    setUI(s=>({...s,cart:{...s.cart,[id]:Math.min(99,(s.cart[id]||0)+quantity)},toast:"Đã thêm vào giỏ"}));
  },[data.products]);
  const updateCart=useCallback((id:string,delta:number)=>{
    setUI(s=>{const cart={...s.cart},applyCSA={...s.applyCSA};cart[id]=Math.max(0,Math.min(99,(cart[id]||0)+delta));
      if(cart[id]===0){delete cart[id];delete applyCSA[id];}
      return {...s,cart,applyCSA,couponCode:"",couponAmount:0,couponError:""};
    });
  },[]);
  const beginCheckout=useCallback(()=>{
    setUI(s=>{
      const saved=data.authenticated?data.addresses[0]:undefined;
      const recipient=saved?{...recipientEmpty,...saved,address:formatAddress(saved),note:s.recipient.note}:
        data.authenticated?{...recipientEmpty,name:data.profile.name,phone:data.profile.phone,note:s.recipient.note}:s.recipient;
      const skip=!!saved && recipient.name.trim().length>=2 && recipient.phone.length===10 && !!recipient.city && !!recipient.ward && recipient.detail.trim().length>=3;
      return {...s,page:"checkout",cartOpen:false,checkoutStep:skip?1:0,checkoutEditRecipient:false,
        checkoutEditFromReview:false,recipient,applyCSA:{},couponDraft:"",couponCode:"",couponAmount:0,couponError:""};
    });
    window.scrollTo({top:0,behavior:"instant"});
  },[data]);
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
    const epoch=authEpoch.current;
    const name=({csa:"getCSA",rewards:"getRewards",referrals:"getReferrals"} as const)[resource];
    if(!["rewards","referrals"].includes(resource)&&!window.NFV_BACKEND?.[name])return;
    setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[resource]:"loading"}}));
    try {
      const value=await call(name);
      if(epoch!==authEpoch.current)return;
      setData(s=>({...s,[resource]:value}));
      setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[resource]:"ready"}}));
    } catch {
      if(epoch===authEpoch.current)setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[resource]:"error"}}));
    }
  },[call,data.authenticated]);
  // Public catalog requests never depend on the customer's authentication status.
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
      safe<Product[]>("getProducts",value=>setData(s=>({...s,products:normalizeProducts(value)}))),
      safe<Category[]>("getCategories",value=>setData(s=>({...s,categories:Array.isArray(value)?value:[]}))),
      safe<{code:string;name:string}[]>("getProvinces",value=>setData(s=>({...s,provinces:Array.isArray(value)?value.filter(x=>x?.code&&x?.name).map(x=>x.name):[]})))
    ]);
    return ()=>{active=false;};
  },[call]);

  // One session owner (AuthProvider); reload private resources whenever it changes.
  useEffect(()=>{
    const epoch=++authEpoch.current;
    let active=true;
    const stillCurrent=()=>active&&epoch===authEpoch.current;
    if(auth.status!=="authenticated"){
      if(auth.status!=="checking"){
        setData(s=>({...s,authenticated:false,hasCSA:false,profile:{name:"",phone:"",email:"",dateOfBirth:null},
          addresses:[],orders:[],csa:null,rewards:null,referrals:null}));
        setUI(s=>({...s,recipient:{...recipientEmpty},accountFetchState:{},applyCSA:{},
          couponCode:"",couponAmount:0,couponDraft:"",addressEditing:false,
          giftIntent:null,referrerDraft:"",referrerError:"",visible:{}}));
      }
      return ()=>{active=false;};
    }
    setData(s=>({...s,authenticated:true,hasCSA:!!auth.session?.hasCSA,
      profile:{name:"",phone:"",email:"",dateOfBirth:null,...auth.session?.profile},
      addresses:[],orders:[],csa:null,rewards:null,referrals:null}));
    const backend=window.NFV_BACKEND;
    const safe=async<T,>(method:keyof Backend,apply:(value:T)=>void)=>{
      if(typeof backend?.[method]!=="function")return;
      try{const value=await call<T>(method);if(stillCurrent())apply(value);}
      catch(error){if(stillCurrent())console.error("NFV account data:",method,error);}
    };
    void Promise.all([
      safe<Address|null>("getAddress",v=>setData(s=>({...s,addresses:v?[v]:[]}))),
      safe<Order[]>("getOrders",v=>setData(s=>({...s,orders:Array.isArray(v)?v:[]}))),
      ...(["csa","rewards","referrals"] as Resource[]).map(kind=>{
        const method=({csa:"getCSA",rewards:"getRewards",referrals:"getReferrals"} as const)[kind];
        if(!["rewards","referrals"].includes(kind)&&!backend?.[method])return Promise.resolve();
        setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[kind]:"loading"}}));
        return call(method).then(v=>{if(stillCurrent()){
          setData(s=>({...s,[kind]:v}));
          setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[kind]:"ready"}}));
        }}).catch(()=>{if(stillCurrent())setUI(s=>({...s,accountFetchState:{...s.accountFetchState,[kind]:"error"}}));});
      })
    ]);
    return ()=>{active=false;};
  },[auth.status,auth.session,call,ui.locale]);
  const value=useMemo(()=>({data,setData,ui,setUI,patch,navigate,call,act,toast,addCart,updateCart,beginCheckout,loadWards,refreshResource}),
    [data,ui,patch,navigate,call,act,toast,addCart,updateCart,beginCheckout,loadWards,refreshResource]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
