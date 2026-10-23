import { NextRequest, NextResponse } from "next/server";
import { publicSiteOrigin } from "@/auth/server/config";
import { exchangeCode } from "@/auth/server/oauth";
import { consumeOAuthFlow, writeSession } from "@/auth/server/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const flow = await consumeOAuthFlow();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  if (!flow || !code || state !== flow.state || error) {
    return NextResponse.redirect(`${publicSiteOrigin()}/${flow?.locale ?? "en"}?auth=oauth`);
  }
  try {
    await writeSession(await exchangeCode(code, flow.verifier));
    return NextResponse.redirect(`${publicSiteOrigin()}${flow.returnTo}`);
  } catch {
    return NextResponse.redirect(`${publicSiteOrigin()}/${flow.locale}?auth=oauth`);
  }
}
