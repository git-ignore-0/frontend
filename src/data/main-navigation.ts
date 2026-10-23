import type {Locale, Screen} from "@/types";
import type {PublicSiteSettings} from "@/types/site-settings";
import {SITE_ORIGIN} from "@/config/site-brand";

export type MainNavId = "home" | "about" | "workshops" | "csa" | "tracker" | "testimonials" | "store" | "forum" | "account" | "plants" | "animals";

/** One definition for every public site link; Account is an app-only drawer action. */
export type MainNavItem = {
  id: MainNavId;
  label: Record<Locale,string>;
  path: string;
  icon: string;
  screen?: Extract<Screen,"home"|"about"|"workshops"|"plants"|"animals"|"tracker"|"testimonials"|"store"|"csa"|"account">;
  external?: boolean;
};

export const MAIN_NAV_ITEMS: readonly MainNavItem[] = [
  {id:"home",label:{vi:"Trang chủ",en:"Home"},path:"/{locale}",icon:"home",screen:"home"},
  {id:"about",label:{vi:"Về chúng tôi",en:"About us"},path:"/about/{locale}",icon:"info",screen:"about"},
  {id:"workshops",label:{vi:"Workshop",en:"Workshops"},path:"/workshops/{locale}",icon:"clock",screen:"workshops"},
  {id:"csa",label:{vi:"CSA",en:"CSA"},path:"/csa/{locale}",icon:"leaf",screen:"csa"},
  {id:"tracker",label:{vi:"Theo dõi nông trại",en:"Farm tracker"},path:"/tracker/{locale}",icon:"pin",screen:"tracker"},
  {id:"store",label:{vi:"Cửa hàng",en:"Store"},path:"/store/{locale}",icon:"bag",screen:"store"}
];

const FORUM_NAV_ITEM:Omit<MainNavItem,"path">={
  id:"forum",label:{vi:"Diễn đàn",en:"Forum"},icon:"share",external:true
};

/** Forum is public only while its enabled link is present in site settings. */
export function mainNavigationItems(settings:PublicSiteSettings|null):readonly MainNavItem[]{
  const forum=settings?.links.find(link=>link.kind==="forum")?.url;
  return forum?[...MAIN_NAV_ITEMS,{...FORUM_NAV_ITEM,path:forum}]:MAIN_NAV_ITEMS;
}

/** Account is available in the compact drawer without changing public destinations. */
export const MAIN_NAV_ACCOUNT: MainNavItem = {
  id:"account",label:{vi:"Tài khoản",en:"Account"},path:"/account/{locale}",icon:"user",screen:"account"
};

export function mainNavHref(item:MainNavItem,locale:Locale):string {
  return item.external ? item.path : item.path.replace("{locale}",locale);
}

/** Implemented screens resolve locally; remaining destinations belong to the public site. */
export function isLocalMainNavItem(item:MainNavItem):boolean {
  return item.screen!==undefined;
}

/** Canonical destination reused by desktop, drawer and footer. */
export function resolveMainNavHref(item:MainNavItem,locale:Locale):string {
  const href=mainNavHref(item,locale);
  return item.external || isLocalMainNavItem(item) ? href : `${SITE_ORIGIN}${href}`;
}

export function navigationItemForPage(page:Screen):MainNavItem|undefined {
  if(page==="testimonials")return {id:"testimonials",label:{vi:"Lời chứng",en:"Stories"},path:"/testimonials/{locale}",icon:"message",screen:"testimonials"};
  if(page==="plants"||page==="animals")return {id:page as MainNavId,label:{vi:page==="plants"?"Cây trồng":"Vật nuôi",en:page==="plants"?"Plants":"Animals"},path:`/${page}/{locale}`,icon:"leaf",screen:page};
  return page==="account" ? MAIN_NAV_ACCOUNT : MAIN_NAV_ITEMS.find(item=>item.screen===page);
}

export function activeMainNavId(page:Screen):MainNavId|null {
  if(page==="home")return "home";
  if(page==="about")return "about";
  if(page==="workshops")return "workshops";
  if(page==="store"||page==="product")return "store";
  if(page==="tracker")return "tracker";
  if(page==="csa")return "csa";
  if(page==="account"||page==="order-detail")return "account";
  return null;
}

/** Only locally implemented routes participate in the client-side router. */
export function localScreenFromPath(pathname:string):Extract<Screen,"home"|"about"|"workshops"|"plants"|"animals"|"tracker"|"testimonials"|"store"|"csa"|"account">|null {
  if(/^\/(vi|en)\/?$/.test(pathname))return "home";
  if(/^\/about\/(vi|en)\/?$/.test(pathname))return "about";
  if(/^\/workshops\/(vi|en)\/?$/.test(pathname))return "workshops";
  if(/^\/plants\/(vi|en)\/?$/.test(pathname))return "plants";
  if(/^\/animals\/(vi|en)\/?$/.test(pathname))return "animals";
  if(/^\/tracker\/(vi|en)\/?$/.test(pathname))return "tracker";
  if(/^\/testimonials\/(vi|en)\/?$/.test(pathname))return "testimonials";
  if(/^\/store\/(vi|en)\/?$/.test(pathname))return "store";
  if(/^\/csa\/(vi|en)\/?$/.test(pathname))return "csa";
  if(/^\/account\/(vi|en)\/?$/.test(pathname))return "account";
  return null;
}

export function localeFromPath(pathname:string):Locale {
  return /\/(en)\/?$/.test(pathname)?"en":"vi";
}
