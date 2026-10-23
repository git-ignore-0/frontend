import { NextRequest, NextResponse } from "next/server";
import { authOrigin, publicSiteOrigin } from "@/auth/server/config";
import { safeReturnTo } from "@/auth/server/validation";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const siteOrigin = publicSiteOrigin();
  const returnTo = safeReturnTo(request.nextUrl.searchParams.get("returnTo"), "/", siteOrigin);
  const account = new URL("/account", authOrigin());
  account.searchParams.set("return_to", new URL(returnTo, siteOrigin).href);
  return NextResponse.redirect(account);
}
