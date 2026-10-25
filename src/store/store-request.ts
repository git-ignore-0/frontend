import type {StoreLocale} from "./store-model";

export type StoreSort="default"|"price_asc"|"price_desc"|"name";
export type StorePriceBand="all"|"low"|"mid"|"high";
export type StoreQuery={locale:StoreLocale;search?:string;categoryId?:string;csaEligible?:boolean;priceMin?:number;priceMax?:number;sort:StoreSort;page:number;pageSize:number};
export const DEFAULT_STORE_PAGE_SIZE=12;
export function storePriceBounds(band:StorePriceBand):Pick<StoreQuery,"priceMin"|"priceMax">{
 return band==="low"?{priceMax:24999}:band==="mid"?{priceMin:25000,priceMax:35000}:band==="high"?{priceMin:35001}:{};
}
export function storeRetrySuffix(retry:number){return retry>0?`&retry=${retry}`:""}
export function storeQueryParams(query:StoreQuery){
 const params=new URLSearchParams({locale:query.locale});
 if(query.search)params.set("search",query.search);
 if(query.categoryId)params.set("category_id",query.categoryId);
 if(query.csaEligible!==undefined)params.set("csa_eligible",String(query.csaEligible));
 if(query.priceMin!==undefined)params.set("price_min",String(query.priceMin));
 if(query.priceMax!==undefined)params.set("price_max",String(query.priceMax));
 params.set("sort",query.sort);params.set("page",String(query.page));params.set("page_size",String(query.pageSize));return params;
}

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function storePublicSearchParams(query:StoreQuery,priceBand:StorePriceBand){
 const params=new URLSearchParams();
 if(query.search)params.set("search",query.search);
 if(query.categoryId)params.set("category_id",query.categoryId);
 if(query.csaEligible)params.set("csa_eligible","true");
 if(priceBand!=="all")params.set("price",priceBand);
 if(query.sort!=="default")params.set("sort",query.sort);
 if(query.page!==1)params.set("page",String(query.page));
 return params;
}
export function parseStoreUrlState(params:URLSearchParams,locale:StoreLocale){
 const search=(params.get("search")??"").trim();
 const category=params.get("category_id")??"";
 const csa=params.get("csa_eligible");
 const price=params.get("price");
 const sort=params.get("sort");
 const pageRaw=params.get("page");
 const priceBand:StorePriceBand=price==="low"||price==="mid"||price==="high"?price:"all";
 const page=pageRaw&&/^[1-9]\d*$/.test(pageRaw)&&Number(pageRaw)<=10_000?Number(pageRaw):1;
 const selectedSort:StoreSort=sort==="price_asc"||sort==="price_desc"||sort==="name"?sort:"default";
 const query:StoreQuery={locale,sort:selectedSort,page,pageSize:DEFAULT_STORE_PAGE_SIZE,...storePriceBounds(priceBand)};
 if(search&&search.length<=100)query.search=search;
 if(UUID.test(category))query.categoryId=category;
 if(csa==="true")query.csaEligible=true;
 return {query,priceBand,canonical:storePublicSearchParams(query,priceBand)};
}
