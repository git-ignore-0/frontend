import { NextResponse } from "next/server";
import { parseTestimonialLocale } from "../validation";
import { parseRetryCacheBypass } from "@/lib/public-request";
import { fetchSiteStories, TestimonialsConfigurationError } from "@/lib/testimonials-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const locale = parseTestimonialLocale(params);
  const bypassCache = parseRetryCacheBypass(params);
  if (locale === null || bypassCache === null) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  }
  try {
    return NextResponse.json(
      await fetchSiteStories("featured", { locale, bypassCache }),
      { headers },
    );
  } catch (error) {
    if (error instanceof TestimonialsConfigurationError) {
      return NextResponse.json({ error: "api_not_configured" }, { status: 503, headers });
    }
    return NextResponse.json({ error: "upstream_unavailable" }, { status: 502, headers });
  }
}
