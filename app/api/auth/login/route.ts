import { NextRequest } from "next/server";
import { beginOAuth } from "@/auth/server/begin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return beginOAuth(request);
}
