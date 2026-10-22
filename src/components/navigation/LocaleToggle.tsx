"use client";

import {localScreenFromPath,navigationItemForPage,mainNavHref} from "@/data/main-navigation";
import {useNFV} from "@/state/NFVContext";

/** Header and mobile drawer share the same locale-switch behavior. */
export function LocaleToggle({variant}:{variant:"header"|"drawer"}){
  const {ui,patch}=useNFV();
  const next=ui.locale==="vi"?"en":"vi";

  function switchLocale(){
    const page=localScreenFromPath(window.location.pathname);
    if(page){
      const item=navigationItemForPage(page);
      if(item)window.history.replaceState({},"",mainNavHref(item,next));
    }
    patch({locale:next});
  }

  return <button type="button" className={variant==="header"?"header-text-btn locale-button":"nfv-locale-toggle"}
    onClick={switchLocale} aria-label={ui.locale==="vi"?"Switch to English":"Chuyển sang tiếng Việt"}>
    {ui.locale==="vi"?"VI / EN":"EN / VI"}
  </button>;
}
