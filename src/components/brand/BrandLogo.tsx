import type {Locale} from "@/types";
import {BRAND_IMAGES} from "@/config/site-brand";

type BrandLogoProps = {
  locale: Locale;
  variant?: "header" | "footer";
};

/** Reuses the two original site logo assets without cropping or duplicating their text. */
export function BrandLogo({locale, variant = "header"}: BrandLogoProps) {
  const label = locale === "vi" ? "Về trang chủ Natural Farming Vietnam" : "Natural Farming Vietnam home";
  const dimensions = variant === "header"
    ? {width: 151, height: 40}
    : {width: 90, height: 101};

  return <a className={`nfv-brand-logo nfv-brand-logo--${variant}`}
    href={`/${locale}`} aria-label={label}>
    <img src={BRAND_IMAGES[variant]} alt="" width={dimensions.width}
      height={dimensions.height} decoding="async" />
  </a>;
}
