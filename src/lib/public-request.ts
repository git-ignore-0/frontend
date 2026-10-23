const RETRY_NONCE = /^(?:[1-9]\d{0,3}|10000)$/;

/** Missing retry uses the normal cache; malformed retry input rejects the request. */
export function parseRetryCacheBypass(searchParams: URLSearchParams): boolean | null {
  const retry = searchParams.get("retry");
  if (retry === null) return false;
  return RETRY_NONCE.test(retry) ? true : null;
}
