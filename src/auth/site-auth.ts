import type {Locale} from "@/types";

/** Native navigation into this app's same-origin OAuth BFF. */
export type SiteAuthAction = "login" | "register";

/** the site's safeReturnTo accepts a same-origin relative URL, never an external URL. */
export function siteAuthHref(action:SiteAuthAction,locale:Locale,returnTo=`/account/${locale}`):string {
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") &&
    !returnTo.includes("\\") && !/[\u0000-\u001f]/.test(returnTo) ? returnTo : `/account/${locale}`;
  const query = new URLSearchParams({locale,returnTo:safeReturnTo});
  return `/api/auth/${action}?${query}`;
}

/** The authentication service checks Origin on POST logout: it MUST be served from the site's own origin. */
export function siteLogoutHref(locale:Locale):string {
  return `/api/auth/logout?${new URLSearchParams({locale})}`;
}

/** Open Core's account form and return to a validated path on this frontend. */
export function siteAccountHref(locale:Locale,returnTo=`/account/${locale}`):string {
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") &&
    !returnTo.includes("\\") && !/[\u0000-\u001f]/.test(returnTo) ? returnTo : `/account/${locale}`;
  return `/api/auth/account?${new URLSearchParams({returnTo:safeReturnTo})}`;
}
