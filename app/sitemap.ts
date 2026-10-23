import type {MetadataRoute} from "next";
import {SITE_ORIGIN} from "@/config/site-brand";
import {getPublicContentOrigin} from "@/lib/public-workshop";
import {getSitemapWorkshops} from "@/lib/sitemap-workshops";
import type {Locale} from "@/types";

const locales:Locale[]=["vi","en"];
const staticPaths=["","/about","/plants","/animals","/workshops","/tracker","/testimonials","/csa","/store"] as const;

function localizedPath(locale:Locale,path:string){return path?`${path}/${locale}`:`/${locale}`;}
function absolute(path:string){return `${SITE_ORIGIN}${path}`;}
function alternatives(path:string){return Object.fromEntries(locales.map(locale=>[locale,absolute(localizedPath(locale,path))]));}

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const staticPages=staticPaths.flatMap(path=>locales.map(locale=>({
    url:absolute(localizedPath(locale,path)),
    changeFrequency:(path===""?"weekly":"monthly") as "weekly"|"monthly",
    priority:path===""?1:path==="/csa"?.9:.8,
    alternates:{languages:alternatives(path)},
  })));
  const origin=getPublicContentOrigin();
  if(!origin)return staticPages;
  const localizedWorkshops=await Promise.all(locales.map(async locale=>({locale,items:await getSitemapWorkshops(origin,locale)})));
  const workshopPages=localizedWorkshops.flatMap(({locale,items})=>items.map(item=>({
    url:absolute(`/workshops/${encodeURIComponent(item.slug)}/${locale}`),
    changeFrequency:"weekly" as const,
    priority:.8,
  }))).slice(0,50_000-staticPages.length);
  return [...staticPages,...workshopPages];
}
