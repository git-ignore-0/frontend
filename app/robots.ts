import type {MetadataRoute} from "next";
import {SITE_ORIGIN} from "@/config/site-brand";

export default function robots():MetadataRoute.Robots{
  return {rules:{userAgent:"*",allow:"/",disallow:["/api/","/ref/"]},sitemap:`${SITE_ORIGIN}/sitemap.xml`};
}
