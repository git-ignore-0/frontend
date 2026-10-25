"use client";

import {useCallback, useState} from "react";
import {Icon} from "@/components/UI";
import {DesktopNavigation} from "@/components/navigation/MainNavigation";
import {MobileNavDrawer} from "@/components/navigation/MobileNavDrawer";
import {LocaleToggle} from "@/components/navigation/LocaleToggle";
import {BrandLogo} from "@/components/brand/BrandLogo";
import {useNFV} from "@/state/NFVContext";

export function Header(){
  const {ui,navigate}=useNFV();
  const accountLabel=ui.locale==="vi"?"Tài khoản":"Account";
  const [menuOpen,setMenuOpen]=useState(false);
  const closeMenu=useCallback(()=>setMenuOpen(false),[]);

  return <>
    <header className="site-header">
      <div className="container header-inner">
        <BrandLogo locale={ui.locale}/>
        <DesktopNavigation/>
        <div className="header-actions">
          <LocaleToggle variant="header"/>
          <button type="button" className={`icon-btn account-button ${["account","order-detail"].includes(ui.page)?"is-active":""}`}
            onClick={()=>navigate("account")} title={accountLabel} aria-label={accountLabel}><Icon name="user" size={18}/></button>
          <button type="button" className="icon-btn nfv-menu-trigger" onClick={()=>setMenuOpen(true)}
            aria-label={ui.locale==="vi"?"Mở menu":"Open menu"} aria-expanded={menuOpen} aria-haspopup="dialog"
            aria-controls="nfv-mobile-navigation"><Icon name="menu" size={21}/></button>
        </div>
      </div>
    </header>
    {menuOpen&&<div id="nfv-mobile-navigation"><MobileNavDrawer onClose={closeMenu}/></div>}
  </>;
}
