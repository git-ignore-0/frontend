import {getPublicContentOrigin} from "@/lib/public-workshop";
import {parseStoreCategories,parseStorePage,parseStoreProductDetail,type StoreLocale} from "@/store/store-model";
import {storeQueryParams,type StoreQuery} from "@/store/store-request";

export class StoreConfigurationError extends Error{}
export class StoreUpstreamError extends Error{constructor(public readonly status:number){super(`store_upstream_status_${status}`);this.name="StoreUpstreamError"}}
type FetchOptions={bypassCache?:boolean};
export function storeFetchOptions(environment:string|undefined,bypassCache:boolean,tags:string[]){return environment==="development"||bypassCache?{cache:"no-store" as const}:{next:{revalidate:300,tags}}}
async function storeJson(url:URL,options:FetchOptions,tags:string[]){
 const response=await fetch(url,{...storeFetchOptions(process.env.NODE_ENV,options.bypassCache===true,tags),headers:{Accept:"application/json"},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new StoreUpstreamError(response.status);return response.json() as Promise<unknown>;
}
function target(path:string){const origin=getPublicContentOrigin();if(!origin)throw new StoreConfigurationError("content_api_not_configured");return new URL(path,origin)}
export async function fetchStoreCategories(options:{locale:StoreLocale;bypassCache?:boolean}){const url=target("/api/v1/public/store-categories");url.searchParams.set("locale",options.locale);return {data:parseStoreCategories(await storeJson(url,options,["store-categories"]))}}
export async function fetchStoreProducts(query:StoreQuery,options:FetchOptions={}){const url=target("/api/v1/public/store-products");url.search=storeQueryParams(query).toString();return parseStorePage(await storeJson(url,options,["store-products"]))}
export async function fetchStoreProduct(slug:string,locale:StoreLocale,options:FetchOptions={}){const url=target(`/api/v1/public/store-products/${encodeURIComponent(slug)}`);url.searchParams.set("locale",locale);return {data:parseStoreProductDetail(await storeJson(url,options,["store-product-details",`store-product:${slug}`]))}}
