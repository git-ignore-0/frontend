import { NextRequest, NextResponse } from "next/server";
import { authOrigin, publicSiteOrigin } from "@/auth/server/config";
import { clearSession } from "@/auth/server/session";
import { parseLocale } from "@/auth/server/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const siteOrigin = publicSiteOrigin();
  if (request.headers.get("origin") !== siteOrigin) {
    return NextResponse.json({ error: "invalid_origin" }, { status: 403 });
  }
  const locale = parseLocale(request.nextUrl.searchParams.get("locale"));
  await clearSession();
  const coreLogout = new URL("/logout/public/", authOrigin());
  coreLogout.searchParams.set("locale", locale);
  coreLogout.searchParams.set("return_to", `${siteOrigin}/${locale}`);
  return NextResponse.redirect(coreLogout, 303);
}
