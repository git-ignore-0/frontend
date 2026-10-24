/** Canonical origin for absolute public URLs such as metadata and share links. */
const DEFAULT_SITE_ORIGIN = "https://naturalfarmingvietnam.com";
const configuredOrigin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || process.env.NEXT_PUBLIC_V2_SITE_ORIGIN)?.trim();

function sitePublicOrigin(): string {
  if (!configuredOrigin) return DEFAULT_SITE_ORIGIN;
  try {
    const url = new URL(configuredOrigin);
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password &&
        url.pathname === "/" && !url.search && !url.hash) return url.origin;
  } catch { /* Fall back to the official public asset host. */ }
  return DEFAULT_SITE_ORIGIN;
}

/** Header lockup and footer mark are local public assets, shared through one mapping. */
export const SITE_ORIGIN = sitePublicOrigin();
export const BRAND_IMAGES = {
  header: "/images/logo-horizontal.png",
  footer: "/images/logo-mark.png",
} as const;
