import {revalidateTag} from "next/cache";
import {NextRequest,NextResponse} from "next/server";
import {parseSignedRevalidation,readLimitedRequestBody} from "@/lib/revalidate-request";

export const runtime="nodejs";

export async function POST(request:NextRequest){
  const raw=await readLimitedRequestBody(request);
  if(!raw)return NextResponse.json({error:"payload_too_large"},{status:413});
  const result=parseSignedRevalidation({
    secret:process.env.CONTENT_REVALIDATE_SECRET||"",
    timestamp:request.headers.get("x-nfv-timestamp")||"",
    signature:request.headers.get("x-nfv-signature")||"",
    raw,
  });
  if(!result.ok)return NextResponse.json({error:result.error},{status:result.status});
  result.tags.forEach(tag=>revalidateTag(tag,{expire:0}));
  return NextResponse.json({revalidated:result.tags});
}
