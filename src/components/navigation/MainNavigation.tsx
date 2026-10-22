"use client";

import type {MouseEvent} from "react";
import {Icon} from "@/components/UI";
import {useAuth} from "@/auth/AuthProvider";
import {GuestAuthActions} from "@/components/auth/GuestAuthActions";
import {activeMainNavId, resolveMainNavHref, MAIN_NAV_ACCOUNT, MAIN_NAV_ITEMS, type MainNavItem} from "@/data/main-navigation";
import {useNFV} from "@/state/NFVContext";

type NavLinkProps = {
  item: MainNavItem;
  variant: "desktop"|"drawer";
  onNavigate?:()=>void;
};

/** Preserve real hrefs for copy/open-in-new-tab, but use client navigation for implemented screens. */
export function MainNavLink({item,variant,onNavigate}:NavLinkProps){
  const {ui,navigate}=useNFV();
  const href=resolveMainNavHref(item,ui.locale);
  const active=activeMainNavId(ui.page)===item.id;
  const label=item.label[ui.locale];

  function follow(event:MouseEvent<HTMLAnchorElement>){
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    if(item.screen){
      event.preventDefault();
      navigate(item.screen);
    }
    onNavigate?.();
  }

  return <a
    href={href}
    onClick={follow}
    target={item.external?"_blank":undefined}
    rel={item.external?"noopener noreferrer":undefined}
    aria-current={active?"page":undefined}
    className={`nfv-nav-link nfv-nav-link--${variant}${active?" is-active":""}`}
  >
    {variant!=="desktop"&&<span className="nfv-nav-link-icon"><Icon name={item.icon} size={18}/></span>}
    <span>{label}</span>
    {item.external&&<Icon name="external" size={14}/>}
  </a>;
}

export function DesktopNavigation(){
  const {ui}=useNFV();
  return <nav className="main-nav" aria-label={ui.locale==="vi"?"Điều hướng chính":"Main navigation"}>
    {MAIN_NAV_ITEMS.map(item=><MainNavLink key={item.id} item={item} variant="desktop"/>) }
  </nav>;
}

export function MobileNavigationLinks({onNavigate}:{onNavigate:()=>void}){
  const {ui}=useNFV();
  const {status}=useAuth();
  return <nav className="nfv-mobile-nav-list" aria-label={ui.locale==="vi"?"Điều hướng chính":"Main navigation"}>
    {MAIN_NAV_ITEMS.map(item=><MainNavLink key={item.id} item={item} variant="drawer" onNavigate={onNavigate}/>) }
    <div className="nfv-mobile-nav-account">
      {status==="authenticated"?<MainNavLink item={MAIN_NAV_ACCOUNT} variant="drawer" onNavigate={onNavigate}/>:
        status==="guest"||status==="expired"?<GuestAuthActions locale={ui.locale} variant="drawer"/>:null}
    </div>
  </nav>;
}
