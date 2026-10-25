import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const source=path=>readFileSync(join(root,path),"utf8");
const require=createRequire(import.meta.url);
const ts=require("typescript");
const compile=(path,jsx=false)=>ts.transpileModule(source(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:jsx?ts.JsxEmit.ReactJSX:undefined}}).outputText;

function runModule(path,requireStub=()=>({}),extra={}){
 const exp={};
 vm.runInNewContext(compile(path),{exports:exp,require:requireStub,URL,URLSearchParams,AbortSignal,fetch,process:{env:{NODE_ENV:"production"}},Error,...extra});
 return exp;
}

function loadModel(){
 return runModule("src/store/store-model.ts",id=>{
  if(id==="@/config/site-brand")return {SITE_ORIGIN:"https://naturalfarmingvietnam.com"};
  throw new Error(`Unexpected import ${id}`);
 });
}

function loadValidation(){
 const publicRequest=runModule("src/lib/public-request.ts");
 return runModule("app/api/store/validation.ts",id=>{
  if(id==="@/lib/public-request")return publicRequest;
  throw new Error(`Unexpected import ${id}`);
 });
}

function loadService({origin="http://127.0.0.1:8000",result={data:[]},status=200}={}){
 const model=loadModel();
 const request=runModule("src/store/store-request.ts");
 const calls=[];
 const fetcher=async(url,init)=>{
  calls.push({url:String(url),init});
  return {ok:status>=200&&status<300,status,json:async()=>result};
 };
 const service=runModule("src/store/store-service.ts",id=>{
  if(id==="@/lib/public-workshop")return {getPublicContentOrigin:()=>origin};
  if(id==="@/store/store-model")return model;
  if(id==="@/store/store-request")return request;
  throw new Error(`Unexpected import ${id}`);
 },{fetch:fetcher,process:{env:{NODE_ENV:"production"}}});
 return {service,calls};
}

function runRoute(path,{result={data:[]},error=null}={}){
 const validation=loadValidation();
 const calls=[];
 class StoreConfigurationError extends Error{}
 class StoreUpstreamError extends Error{constructor(status){super(`status_${status}`);this.status=status;}}
 const invoke=async(name,args)=>{
  calls.push([name,...args]);
  if(error==="configuration")throw new StoreConfigurationError();
  if(typeof error==="number")throw new StoreUpstreamError(error);
  if(error)throw new Error("private upstream failure");
  return result;
 };
 const service={
  fetchStoreCategories:(...args)=>invoke("categories",args),
  fetchStoreProducts:(...args)=>invoke("products",args),
  fetchStoreProduct:(...args)=>invoke("detail",args),
  StoreConfigurationError,StoreUpstreamError,
 };
 const exp={};
 vm.runInNewContext(compile(path),{exports:exp,require:id=>{
  if(id==="next/server")return {NextResponse:{json:(body,init={})=>new Response(JSON.stringify(body),{...init,headers:{"Content-Type":"application/json",...(init.headers??{})}})}};
  if(id==="@/store/store-service")return service;
  if(id==="../validation"||id==="../../validation")return validation;
  throw new Error(`Unexpected import ${id}`);
 },URL,Response,Error});
 return {route:exp,calls};
}

const image={id:"7346d93d-ff39-44b0-81b8-d25191f4a616",url:"/media/products/tomato.webp",width:1600,height:1200,variants:[{url:"https://cdn.example/tomato-640.webp",width:640,height:480}]};
const category={id:"e55e4778-0528-4594-a4bf-cab97007c50f",parent_id:null,slug:"vegetables",sort_order:2,name:"Vegetables",requested_locale:"en",content_locale:"en",is_fallback:false};
const product={id:"5a9ec50d-0dc7-4dbc-a9db-202c5436420f",slug:"tomato",sku:"TOMATO",name:"Tomato",alternate_name:"Cà chua",short_description:"Fresh",retail_price_vnd:45000,unit_size:"1.000",unit_label:"kg",category:{id:category.id,slug:category.slug,name:category.name},primary_image:image,csa_eligible:true,suppliers:[{id:"28e3d9cc-5bef-469f-a1de-dc77f2c5dac7",name:"Farm A"}],requested_locale:"en",content_locale:"en",available_locales:["en","vi"],is_fallback:false};

test("Store runtime parsers accept the exact public contract and normalize safe media URLs",()=>{
 const model=loadModel();
 const categories=model.parseStoreCategories({data:[{...category,slug:"root_vegetables"}]});
 assert.equal(categories[0].name,"Vegetables");
 const page=model.parseStorePage({data:[product],meta:{page:1,page_size:12,total:1}});
 assert.equal(page.data[0].primary_image.url,"https://naturalfarmingvietnam.com/media/products/tomato.webp");
 assert.equal(page.data[0].retail_price_vnd,45000);
 const detail=model.parseStoreProductDetail({data:{...product,description:"Harvested today",suppliers:[{...product.suppliers[0],location:"Da Lat"}]}});
 assert.equal(detail.description,"Harvested today");
 assert.equal(detail.suppliers[0].location,"Da Lat");
});

test("Store runtime parsers reject malformed envelopes, money, locale and unsafe images",()=>{
 const model=loadModel();
 for(const payload of [
  {wrong:[]},
  {data:[{...product,retail_price_vnd:"45000"}],meta:{page:1,page_size:12,total:1}},
  {data:[{...product,requested_locale:"fr"}],meta:{page:1,page_size:12,total:1}},
  {data:[{...product,primary_image:{...image,url:"javascript:alert(1)"}}],meta:{page:1,page_size:12,total:1}},
  {data:[product],meta:{page:0,page_size:12,total:1}},
 ])assert.throws(()=>model.parseStorePage(payload));
 assert.throws(()=>model.parseStoreCategories({data:[{...category,id:"bad"}]}));
 assert.throws(()=>model.parseStoreProductDetail({data:product}));
});

test("Store request validation applies exact defaults and accepts bounded filters",()=>{
 const validation=loadValidation();
 const parsed=validation.parseStoreListRequest(new URL("http://localhost/api/store/products?locale=en&search=%20tomato%20&category_id=e55e4778-0528-4594-a4bf-cab97007c50f&csa_eligible=true&price_min=10000&price_max=50000&sort=price_asc&page=2&page_size=24&retry=3").searchParams);
 assert.deepEqual(JSON.parse(JSON.stringify(parsed)),{query:{locale:"en",search:"tomato",categoryId:"e55e4778-0528-4594-a4bf-cab97007c50f",csaEligible:true,priceMin:10000,priceMax:50000,sort:"price_asc",page:2,pageSize:24},bypassCache:true});
 assert.deepEqual(JSON.parse(JSON.stringify(validation.parseStoreListRequest(new URLSearchParams("locale=vi")))),{query:{locale:"vi",sort:"default",page:1,pageSize:12},bypassCache:false});
});

test("Store request validation rejects missing locale, duplicates and unbounded values",()=>{
 const validation=loadValidation();
 for(const query of ["","locale=fr","locale=vi&sort=featured","locale=vi&page=0","locale=vi&page_size=49","locale=vi&price_min=-1","locale=vi&price_max=1000000001","locale=vi&price_min=50000&price_max=40000","locale=vi&retry=0","locale=vi&retry=10001","locale=vi&unknown=1","locale=vi&sort=name&sort=default","locale=vi&search="+"x".repeat(101)])
  assert.equal(validation.parseStoreListRequest(new URLSearchParams(query)),null,query);
});

test("Store service builds only public backend URLs and applies cache tags or retry bypass",async()=>{
 const list=loadService({result:{data:[product],meta:{page:1,page_size:12,total:1}}});
 await list.service.fetchStoreProducts({locale:"en",search:"tomato",sort:"price_asc",page:2,pageSize:12},{bypassCache:false});
 assert.equal(list.calls[0].url,"http://127.0.0.1:8000/api/v1/public/store-products?locale=en&search=tomato&sort=price_asc&page=2&page_size=12");
 assert.deepEqual(JSON.parse(JSON.stringify(list.calls[0].init.next)),{revalidate:300,tags:["store-products"]});
 const detail=loadService({result:{data:{...product,description:"Full",suppliers:[{...product.suppliers[0],location:"Da Lat"}]}}});
 await detail.service.fetchStoreProduct("tomato","vi",{bypassCache:false});
 assert.equal(detail.calls[0].url,"http://127.0.0.1:8000/api/v1/public/store-products/tomato?locale=vi");
 assert.deepEqual(JSON.parse(JSON.stringify(detail.calls[0].init.next)),{revalidate:300,tags:["store-product-details","store-product:tomato"]});
});

test("Store BFF routes reject invalid input before touching upstream",async()=>{
 for(const [path,url,context] of [
  ["app/api/store/categories/route.ts","http://localhost/api/store/categories?locale=fr",undefined],
  ["app/api/store/products/route.ts","http://localhost/api/store/products?locale=vi&page_size=99",undefined],
  ["app/api/store/products/[slug]/route.ts","http://localhost/api/store/products/bad%20slug?locale=en",{params:Promise.resolve({slug:"bad slug"})}],
 ]){
  const {route,calls}=runRoute(path);
  const response=await route.GET(new Request(url),context);
  assert.equal(response.status,400,url);
  assert.equal(calls.length,0,url);
 }
});

test("Store BFF routes preserve typed calls and safe upstream statuses",async()=>{
 const list=runRoute("app/api/store/products/route.ts",{result:{data:[],meta:{page:1,page_size:12,total:0}}});
 assert.equal((await list.route.GET(new Request("http://localhost/api/store/products?locale=vi"))).status,200);
 assert.deepEqual(JSON.parse(JSON.stringify(list.calls)),[["products",{locale:"vi",sort:"default",page:1,pageSize:12},{bypassCache:false}]]);
 const missing=runRoute("app/api/store/products/[slug]/route.ts",{error:404});
 assert.equal((await missing.route.GET(new Request("http://localhost/api/store/products/tomato?locale=en"),{params:Promise.resolve({slug:"tomato"})})).status,404);
 const unavailable=runRoute("app/api/store/categories/route.ts",{error:"configuration"});
 assert.equal((await unavailable.route.GET(new Request("http://localhost/api/store/categories?locale=vi"))).status,503);
 const failed=runRoute("app/api/store/products/route.ts",{error:"upstream"});
 assert.equal((await failed.route.GET(new Request("http://localhost/api/store/products?locale=en"))).status,502);
 const underscore=runRoute("app/api/store/products/[slug]/route.ts",{result:{data:{}}});
 assert.equal((await underscore.route.GET(new Request("http://localhost/api/store/products/root_vegetables?locale=vi"),{params:Promise.resolve({slug:"root_vegetables"})})).status,200);
});
