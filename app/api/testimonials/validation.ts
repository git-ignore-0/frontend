export type TestimonialLocale = "vi" | "en";
export type TestimonialFilter = "all" | "customer" | "farmer";

export function parseTestimonialLocale(
  searchParams: URLSearchParams,
): TestimonialLocale | null {
  const locale = searchParams.get("locale") ?? "vi";
  return locale === "vi" || locale === "en" ? locale : null;
}

export function parseTestimonialFilter(
  searchParams: URLSearchParams,
): TestimonialFilter | null {
  const type = searchParams.get("type") ?? "all";
  return type === "all" || type === "customer" || type === "farmer" ? type : null;
}

export function parseBoundedInteger(
  searchParams: URLSearchParams,
  name: string,
  fallback: number,
  maximum: number,
): number | null {
  const raw = searchParams.get(name);
  if (raw === null) return fallback;
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value <= maximum ? value : null;
}
