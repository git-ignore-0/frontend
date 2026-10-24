import type {Locale} from "@/types";

const REFERRAL_LOCALE_PATH=/^\/(?:share\/)?ref\/[^/]+\/?$/;

/** Resolve the document language from routes controlled by this frontend. */
export function requestLocale(url:URL):Locale{
  const pathname=url.pathname;
  if(/\/en\/?$/.test(pathname))return "en";
  if(REFERRAL_LOCALE_PATH.test(pathname)&&url.searchParams.get("locale")==="en")return "en";
  return "vi";
}
