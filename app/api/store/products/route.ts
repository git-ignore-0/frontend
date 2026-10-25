import {NextResponse} from "next/server";
import {fetchStoreProducts,StoreConfigurationError} from "@/store/store-service";
import {parseStoreListRequest} from "../validation";
export const runtime="nodejs";export const dynamic="force-dynamic";const headers={"Cache-Control":"no-store"};
export async function GET(request:Request){const parsed=parseStoreListRequest(new URL(request.url).searchParams);if(!parsed)return NextResponse.json({error:"invalid_request"},{status:400,headers});try{return NextResponse.json(await fetchStoreProducts(parsed.query,{bypassCache:parsed.bypassCache}),{headers})}catch(error){return NextResponse.json({error:error instanceof StoreConfigurationError?"api_not_configured":"upstream_unavailable"},{status:error instanceof StoreConfigurationError?503:502,headers})}}
