"use client";

import {syncLocaleRoute} from "@/lib/browser-navigation";
import {useNFV} from "@/state/NFVContext";

/** Header and mobile drawer share the same locale-switch behavior. */
export function LocaleToggle({variant}:{variant:"header"|"drawer"}){
  const {ui,patch,documentNavigation}=useNFV();
  const next=ui.locale==="vi"?"en":"vi";

  function switchLocale(){
    if(syncLocaleRoute(window,next,{documentNavigation}))return;
    patch({locale:next});
  }

  return <button type="button" className={variant==="header"?"header-text-btn locale-button":"nfv-locale-toggle"}
    onClick={switchLocale} aria-label={ui.locale==="vi"?"Switch to English":"Chuyển sang tiếng Việt"}>
    {ui.locale==="vi"?"VI / EN":"EN / VI"}
  </button>;
}
