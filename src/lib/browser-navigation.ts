type BrowserRouteTarget = {
  location: {
    pathname: string;
    search?: string;
    hash?: string;
    assign: (href:string)=>void;
    replace: (href:string)=>void;
  };
};

type BrowserRouteOptions = {
  replace?: boolean;
};

type Locale = "vi"|"en";

/**
 * Every public URL owns server-rendered content and metadata, so changing routes must
 * leave the current document instead of only changing History API state.
 */
export function syncBrowserRoute(browser:BrowserRouteTarget,href:string|null,options:BrowserRouteOptions={}):boolean {
  const currentHref=`${browser.location.pathname}${browser.location.search??""}${browser.location.hash??""}`;
  if(!href||currentHref===href)return false;
  if(options.replace)browser.location.replace(href);
  else browser.location.assign(href);
  return true;
}

export function localizedRouteHref(pathname:string,locale:Locale):string|null {
  const normalized=pathname.replace(/\/+$/,"")||"/";
  return /\/(vi|en)$/.test(normalized)?normalized.replace(/\/(vi|en)$/,`/${locale}`):null;
}

export function syncLocaleRoute(browser:BrowserRouteTarget,locale:Locale):boolean {
  const localized=localizedRouteHref(browser.location.pathname,locale);
  const href=localized?`${localized}${browser.location.search??""}${browser.location.hash??""}`:null;
  return syncBrowserRoute(browser,href,{replace:true});
}
