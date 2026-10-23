import { parseRetryCacheBypass } from "@/lib/public-request";

/** Keep local CMS edits visible while retaining the production cache used by v2. */
export function trackerFetchOptions(
  environment: string | undefined = process.env.NODE_ENV,
  bypassCache = false,
) {
  if (environment === "development" || bypassCache) {
    return { cache: "no-store" as const };
  }

  return { next: { revalidate: 300, tags: ["tracker-farms"] } };
}

export function parseTrackerRequest(searchParams: URLSearchParams): {
  locale: "vi" | "en";
  bypassCache: boolean;
} | null {
  const locale = searchParams.get("locale");
  const bypassCache = parseRetryCacheBypass(searchParams);
  if ((locale !== "vi" && locale !== "en") || bypassCache === null) {
    return null;
  }

  return { locale, bypassCache };
}

/** Retry requests carry a nonce so the BFF can deliberately bypass its upstream cache. */
export function trackerRetrySuffix(retryNumber: number) {
  return retryNumber > 0 ? `&retry=${retryNumber}` : "";
}
