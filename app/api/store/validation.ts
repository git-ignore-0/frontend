import {parseRetryCacheBypass} from "@/lib/public-request";
import type {StoreLocale} from "@/store/store-model";
import type {StoreQuery,StoreSort} from "@/store/store-request";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG=/^[a-z0-9_-]+$/i;
const LIST_KEYS=new Set(["locale","search","category_id","csa_eligible","price_min","price_max","sort","page","page_size","retry"]);
const SIMPLE_KEYS=new Set(["locale","retry"]);
function uniqueAllowed(params:URLSearchParams,allowed:Set<string>){for(const key of params.keys())if(!allowed.has(key)||params.getAll(key).length!==1)return false;return true}
function locale(params:URLSearchParams):StoreLocale|null{const value=params.get("locale");return value==="vi"||value==="en"?value:null}
function integer(params:URLSearchParams,key:string,fallback:number,max:number){const raw=params.get(key);if(raw===null)return fallback;if(!/^[1-9]\d*$/.test(raw))return null;const value=Number(raw);return Number.isSafeInteger(value)&&value<=max?value:null}
function money(params:URLSearchParams,key:string){const raw=params.get(key);if(raw===null)return undefined;if(!/^(?:0|[1-9]\d*)$/.test(raw))return null;const value=Number(raw);return Number.isSafeInteger(value)&&value<=1_000_000_000?value:null}
function retry(params:URLSearchParams){return parseRetryCacheBypass(params)}
export function parseStoreCategoryRequest(params:URLSearchParams){const selected=locale(params),bypassCache=retry(params);return uniqueAllowed(params,SIMPLE_KEYS)&&selected&&bypassCache!==null?{locale:selected,bypassCache}:null}
export function parseStoreListRequest(params:URLSearchParams):{query:StoreQuery;bypassCache:boolean}|null{
 if(!uniqueAllowed(params,LIST_KEYS))return null;const selected=locale(params),bypassCache=retry(params);if(!selected||bypassCache===null)return null;
 const rawSearch=params.get("search")?.trim();if(rawSearch&&rawSearch.length>100)return null;
 const categoryId=params.get("category_id");if(categoryId!==null&&!UUID.test(categoryId))return null;
 const rawCsa=params.get("csa_eligible");if(rawCsa!==null&&rawCsa!=="true"&&rawCsa!=="false")return null;
 const priceMin=money(params,"price_min"),priceMax=money(params,"price_max");if(priceMin===null||priceMax===null||priceMin!==undefined&&priceMax!==undefined&&priceMin>priceMax)return null;
 const rawSort=params.get("sort")??"default";if(!["default","price_asc","price_desc","name"].includes(rawSort))return null;
 const page=integer(params,"page",1,10_000),pageSize=integer(params,"page_size",12,48);if(page===null||pageSize===null)return null;
 const query:StoreQuery={locale:selected,sort:rawSort as StoreSort,page,pageSize};if(rawSearch)query.search=rawSearch;if(categoryId)query.categoryId=categoryId;if(rawCsa!==null)query.csaEligible=rawCsa==="true";if(priceMin!==undefined)query.priceMin=priceMin;if(priceMax!==undefined)query.priceMax=priceMax;
 return {query,bypassCache};
}
export function parseStoreDetailRequest(params:URLSearchParams,slug:string){const base=parseStoreCategoryRequest(params);return base&&slug.length<=180&&SLUG.test(slug)?base:null}
