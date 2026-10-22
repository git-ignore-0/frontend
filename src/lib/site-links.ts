import type {Locale} from "@/types";
import {SITE_ORIGIN} from "@/config/site-brand";
/** Public site still owns destinations not yet implemented inside this app. */
export function isLocalPublicPage(path:string):boolean {return path==="plants"||path==="animals"||path==="testimonials";}
export function sitePageHref(locale:Locale,path:string){
  // Implemented knowledge pages belong to this application; others stay on the public site.
  if(isLocalPublicPage(path))return `/${path}/${locale}`;
  return `${SITE_ORIGIN}/${path}/${locale}`;
}
