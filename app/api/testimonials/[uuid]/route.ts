import { NextResponse } from "next/server";
import { parseTestimonialLocale } from "../validation";
import { parseRetryCacheBypass } from "@/lib/public-request";
import {
  fetchSiteStories,
  TestimonialsConfigurationError,
  TestimonialsUpstreamError,
} from "@/lib/testimonials-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;
  const searchParams = new URL(request.url).searchParams;
  const locale = parseTestimonialLocale(searchParams);
  const bypassCache = parseRetryCacheBypass(searchParams);
  if (locale === null || !UUID.test(uuid) || bypassCache === null) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  }
  try {
    return NextResponse.json(
      await fetchSiteStories("detail", { locale, id: uuid, bypassCache }),
      { headers },
    );
  } catch (error) {
    if (error instanceof TestimonialsConfigurationError) {
      return NextResponse.json({ error: "api_not_configured" }, { status: 503, headers });
    }
    if (error instanceof TestimonialsUpstreamError && error.status === 404) {
      return NextResponse.json({ error: "not_found" }, { status: 404, headers });
    }
    return NextResponse.json({ error: "upstream_unavailable" }, { status: 502, headers });
  }
}
