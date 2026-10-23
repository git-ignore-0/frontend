import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { authOrigin, oauthClientId, publicSiteOrigin } from "@/auth/server/config";
import { pkceChallenge, PUBLIC_SCOPES, randomUrlSafe } from "@/auth/server/oauth";
import { writeOAuthFlow } from "@/auth/server/session";
import { parseLocale, safeReturnTo } from "@/auth/server/validation";
import { isReferralCode } from "@/account/referral-presentation";

export async function beginOAuth(
  request: NextRequest,
  options: { signup?: boolean; referralCode?: string; returnTo?: string } = {},
) {
  const locale = parseLocale(request.nextUrl.searchParams.get("locale"));
  const fallback = `/${locale}`;
  const returnTo = safeReturnTo(
    options.returnTo ?? request.nextUrl.searchParams.get("returnTo"),
    fallback,
    publicSiteOrigin(),
  );
  const state = randomUrlSafe();
  const verifier = randomUrlSafe(48);
  const referralCode=options.signup&&options.referralCode&&isReferralCode(options.referralCode)?options.referralCode:undefined;
  await writeOAuthFlow({ state, verifier, returnTo, locale, ...(referralCode?{referralCode}:{}) });

  const authorize = new URL("/oauth/authorize", authOrigin());
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: oauthClientId(),
    redirect_uri: `${publicSiteOrigin()}/api/auth/callback`,
    scope: PUBLIC_SCOPES,
    state,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: "S256",
    ui_locales: locale,
    ...(options.signup ? { screen_hint: "signup" } : {}),
    ...(referralCode ? { referral_code: referralCode } : {}),
  }).toString();
  return NextResponse.redirect(authorize);
}
