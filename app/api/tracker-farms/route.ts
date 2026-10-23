import { NextResponse } from "next/server";
import { getPublicContentOrigin } from "@/lib/public-workshop";
import { parseTrackerRequest, trackerFetchOptions } from "@/screens/tracker/tracker-api";
import { parseTrackerFarms } from "@/screens/tracker/tracker-model";

export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store" };
/** Server-side public data proxy. Never invent farm counts on API failure. */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const input = parseTrackerRequest(searchParams);
    if (!input)
        return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStoreHeaders });
    const { locale, bypassCache } = input;
    const origin = getPublicContentOrigin();
    if (!origin)
        return NextResponse.json({ error: "Tracker API not configured" }, { status: 503, headers: noStoreHeaders });
    try {
        const response = await fetch(`${origin}/api/v1/public/tracker-farms?locale=${locale}`, {
            ...trackerFetchOptions(process.env.NODE_ENV, bypassCache),
            signal: AbortSignal.timeout(8000)
        });
        if (!response.ok)
            throw new Error(`Tracker upstream HTTP ${response.status}`);
        const farms = parseTrackerFarms(await response.json());
        return NextResponse.json({ data: farms }, { headers: noStoreHeaders });
    }
    catch {
        return NextResponse.json({ error: "Tracker data unavailable" }, { status: 502, headers: noStoreHeaders });
    }
}
