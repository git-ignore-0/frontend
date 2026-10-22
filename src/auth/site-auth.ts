import type {Locale} from "@/types";

/** The external site owns OAuth and its sealed HttpOnly session cookie. The app only creates entry links. */
export type SiteAuthAction = "login" | "register";

// Leave unset when the frontend and public site are served under one origin (recommended).
// Set to the public site origin for standalone links; cross-origin SSO then
// requires a server-side integration and is NOT provided by these links alone.
const configuredOrigin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || process.env.NEXT_PUBLIC_V2_SITE_ORIGIN)?.trim() || "";

function siteOrigin():string {
  if (!configuredOrigin) return "";
  const url = new URL(configuredOrigin);
  if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_SITE_ORIGIN must be an HTTP(S) origin, without path/query/credentials");
  }
  return url.origin;
}

/** the site's safeReturnTo accepts a same-origin relative URL, never an external URL. */
export function siteAuthHref(action:SiteAuthAction,locale:Locale,returnTo=`/account/${locale}`):string {
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") &&
    !returnTo.includes("\\") && !/[\u0000-\u001f]/.test(returnTo) ? returnTo : `/account/${locale}`;
  const query = new URLSearchParams({locale,returnTo:safeReturnTo});
  return `${siteOrigin()}/api/auth/${action}?${query}`;
}

/** The authentication service checks Origin on POST logout: it MUST be served from the site's own origin. */
export function siteLogoutHref(locale:Locale):string {
  return `/api/auth/logout?${new URLSearchParams({locale})}`;
}

/** When a separate public site is configured, send users to the public site to end their session. */
export function externalSiteAccountHref(locale:Locale):string|null {
  const origin=siteOrigin();
  return origin ? `${origin}/account/${locale}` : null;
}
