import {SITE_ORIGIN} from "@/config/site-brand";
/** Static editorial photographs are provided by the public NFV site. */
export function siteImageSrc(file:string){
  return `${SITE_ORIGIN}/images/${file.replace(/^\/+/,"")}`;
}
