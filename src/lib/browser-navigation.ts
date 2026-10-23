type BrowserRouteTarget = {
  location: {
    pathname: string;
    assign: (href:string)=>void;
    replace: (href:string)=>void;
  };
  history: {
    pushState: (data:unknown,unused:string,url?:string|URL|null)=>void;
    replaceState: (data:unknown,unused:string,url?:string|URL|null)=>void;
  };
};

type BrowserRouteOptions = {
  documentNavigation: boolean;
  replace?: boolean;
};

type Locale = "vi"|"en";

/**
 * Server-rendered route content cannot be swapped by the in-app screen state.
 * It must leave the document; regular app screens keep the faster History API path.
 */
export function syncBrowserRoute(browser:BrowserRouteTarget,href:string|null,options:BrowserRouteOptions):boolean {
  if(!href||browser.location.pathname===href)return false;
  if(options.documentNavigation){
    if(options.replace)browser.location.replace(href);
    else browser.location.assign(href);
    return true;
  }
  if(options.replace)browser.history.replaceState({},"",href);
  else browser.history.pushState({},"",href);
  return false;
}

export function localizedRouteHref(pathname:string,locale:Locale):string|null {
  const normalized=pathname.replace(/\/+$/,"")||"/";
  return /\/(vi|en)$/.test(normalized)?normalized.replace(/\/(vi|en)$/,`/${locale}`):null;
}

export function syncLocaleRoute(browser:BrowserRouteTarget,locale:Locale,options:Pick<BrowserRouteOptions,"documentNavigation">):boolean {
  return syncBrowserRoute(browser,localizedRouteHref(browser.location.pathname,locale),{...options,replace:true});
}
