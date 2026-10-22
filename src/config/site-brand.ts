/** Canonical brand image owned by the public website. Use the configured public site for local/staging previews. */
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

/** The images are intentionally different in source site: header lockup vs. footer mark.
 * Keep asset mapping in one place, and never recreate its artwork with CSS/icons. */
export const SITE_ORIGIN = sitePublicOrigin();
export const BRAND_IMAGES = {
  header: `${SITE_ORIGIN}/images/logo-horizontal.png`,
  footer: `${SITE_ORIGIN}/images/logo-mark.png`,
} as const;
