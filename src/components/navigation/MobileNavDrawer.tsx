"use client";

import {useEffect} from "react";
import {SideDrawer} from "@/components/overlays/OverlayPrimitives";
import {MobileNavigationLinks} from "@/components/navigation/MainNavigation";
import {LocaleToggle} from "@/components/navigation/LocaleToggle";
import {useNFV} from "@/state/NFVContext";

type Props={onClose:()=>void};

/** Menu, cart and Stories now share the same panel, close button and focus behavior. */
export function MobileNavDrawer({onClose}:Props){
  const {ui}=useNFV();
  useEffect(()=>{
    const media=window.matchMedia("(min-width: 1280px)");
    if(media.matches){onClose();return;}
    const onChange=(event:MediaQueryListEvent)=>{if(event.matches)onClose();};
    media.addEventListener("change",onChange);
    return ()=>media.removeEventListener("change",onChange);
  },[onClose]);

  return <SideDrawer title="Menu" onClose={onClose} closeLabel={ui.locale==="vi"?"Đóng menu":"Close menu"} className="nfv-navigation-drawer">
    <div className="nfv-mobile-nav-scroll"><MobileNavigationLinks onNavigate={onClose}/></div>
    <div className="nfv-mobile-nav-footer">
      <span>{ui.locale==="vi"?"Ngôn ngữ":"Language"}</span>
      <LocaleToggle variant="drawer"/>
    </div>
  </SideDrawer>;
}
