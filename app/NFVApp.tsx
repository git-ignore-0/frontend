"use client";
import {useEffect,type ReactNode} from "react";
import {NFVProvider,useNFV} from "@/state/NFVContext";
import {AuthProvider} from "@/auth/AuthProvider";
import {AuthGate} from "@/components/auth/AuthGate";
import type {Locale,Screen} from "@/types";
import {Header} from "@/components/navigation/SiteHeader";
import {SiteFooter} from "@/components/layout/SiteFooter";
import {HomePage} from "@/screens/home/HomePage";
import {AboutPage} from "@/screens/about/AboutPage";
import {WorkshopsPage} from "@/screens/workshops/WorkshopsPage";
import {PlantsPage} from "@/screens/plants/PlantsPage";
import {AnimalsPage} from "@/screens/animals/AnimalsPage";
import {TrackerPage} from "@/screens/tracker/TrackerPage";
import {TestimonialsPage} from "@/screens/testimonials/TestimonialsPage";
import {StoriesWidget} from "@/components/testimonials/StoriesWidget";
import {Store,ProductDetail,CategoryNavigation,FilterSheet} from "@/screens/Store";
import {CSAProgram} from "@/screens/CSAProgram";
import {Checkout,CartDrawer} from "@/screens/Checkout";
import {Account} from "@/screens/Account";
import {OrderDetail} from "@/screens/AccountOrders";
import {Icon} from "@/components/UI";
import {money} from "@/lib/format";
import {Button} from "@/components/UI";

/** Show public storytelling only on editorial pages. Keep checkout/account free of floating overlays. */
const PUBLIC_STORY_PAGES = new Set<Screen>(["home","about","plants","animals","tracker"]);
function Body({children}:{children?:ReactNode}){
 const {ui,patch,data,addCart}=useNFV();
 const product=data.products.find(p=>p.id===ui.productId)||data.products[0];
 useEffect(()=>{
   const close=(e:KeyboardEvent)=>{if(e.key==="Escape"&&ui.orderDateOpen)patch({orderDateOpen:false});};
   window.addEventListener("keydown",close);return ()=>window.removeEventListener("keydown",close);
 },[patch,ui.orderDateOpen]);
 return <div className={`nfv-app${ui.page==="account"||ui.page==="order-detail"?" nfv-app--auth-route":""}`}><Header/>
   {children??(ui.page==="home"?<HomePage/>:ui.page==="about"?<AboutPage/>:ui.page==="workshops"?<WorkshopsPage/>:ui.page==="plants"?<PlantsPage/>:ui.page==="animals"?<AnimalsPage/>:ui.page==="tracker"?<TrackerPage/>:ui.page==="testimonials"?<TestimonialsPage/>:ui.page==="store"?<Store/>:ui.page==="product"?<ProductDetail/>:ui.page==="checkout"?<Checkout/>:ui.page==="account"?<AuthGate><Account/></AuthGate>:ui.page==="csa"?<CSAProgram/>:ui.page==="order-detail"?<AuthGate><OrderDetail/></AuthGate>:<Store/>)}
   <SiteFooter/>
   {!children&&PUBLIC_STORY_PAGES.has(ui.page)&&<StoriesWidget/>}
   {ui.cartOpen&&<CartDrawer/>}
   {ui.filterOpen&&<FilterSheet/>}
   {ui.categoryOpen&&<CategoryNavigation mobile/>}
   {ui.page==="product"&&product&&<div className="mobile-sticky"><div className="flex gap10"><div><div className="price">{money(product.price*ui.detailQty)}</div><div className="unit">{ui.detailQty} × {product.unit}</div></div><Button className="grow" onClick={()=>addCart(product.id,ui.detailQty)}><Icon name="bag" size={17}/> Thêm vào giỏ</Button></div></div>}
   {ui.toast&&!ui.cartOpen&&!ui.filterOpen&&<div className="toast" role="status"><Icon name="check" size={20}/> {ui.toast}</div>}
 </div>;
}
export function NFVApp({initialPage="home",initialLocale="vi",children}:{initialPage?:Screen;initialLocale?:Locale;children?:ReactNode}){return <AuthProvider><NFVProvider initialPage={initialPage} initialLocale={initialLocale} documentNavigation={children!=null}><Body>{children}</Body></NFVProvider></AuthProvider>;}
