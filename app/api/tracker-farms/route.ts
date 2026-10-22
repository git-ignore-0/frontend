import { NextResponse } from "next/server";
import { getPublicContentOrigin } from "@/lib/public-workshop";
import { parseTrackerFarms } from "@/screens/tracker/tracker-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStoreHeaders = { "Cache-Control": "no-store" };
/** Server-side public data proxy. Never invent farm counts on API failure. */
export async function GET(request: Request) {
    const locale = new URL(request.url).searchParams.get("locale") === "en" ? "en" : "vi";
    const origin = getPublicContentOrigin();
    if (!origin)
        return NextResponse.json({ error: "Tracker API not configured" }, { status: 503, headers: noStoreHeaders });
    try {
        const response = await fetch(`${origin}/api/v1/public/tracker-farms?locale=${locale}`, {
            cache: "no-store", signal: AbortSignal.timeout(8000)
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
