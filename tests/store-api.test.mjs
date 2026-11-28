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
 vm.runInNewContext(compile(path,path.endsWith(".tsx")),{exports:exp,require:id=>id.endsWith("/csa-units.ts")?runModule("src/lib/csa-units.ts"):requireStub(id),URL,URLSearchParams,AbortSignal,fetch,process:{env:{NODE_ENV:"production"}},Error,...extra});
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

test("catalog response rejects an unexpected page or repeated product identity",()=>{
 const {parseStorePage}=loadModel();
 const expected={page:2,pageSize:24,locale:"en"};
 assert.throws(()=>parseStorePage({data:[],meta:{page:1,page_size:24,total:100}},expected));
 assert.throws(()=>parseStorePage({data:[],meta:{page:2,page_size:24,total:Number.MAX_SAFE_INTEGER+1}},expected));
 assert.throws(()=>parseStorePage({data:[product,product],meta:{page:2,page_size:24,total:100}},expected));
});

function loadService({origin="http://127.0.0.1:8000",result={data:[]},status=200}={}){
 const model=loadModel();
 const request=runModule("src/store/store-request.ts");
 const calls=[];
 const fetcher=async(url,init)=>{
  calls.push({url:String(url),init});
  return {ok:status>=200&&status<300,status,json:async()=>typeof result==="function"?result(url):result};
 };
 const service=runModule("src/store/store-service.ts",id=>{
  if(id==="@/lib/public-workshop")return {getPublicContentOrigin:()=>origin};
  if(id==="@/store/store-model")return model;
  if(id==="@/store/store-request")return request;
  throw new Error(`Unexpected import ${id}`);
 },{fetch:fetcher,process:{env:{NODE_ENV:"production"}}});
 return {service,calls};
}

function runRoute(path,{result={data:[]},error=null,upstream}={}){
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
  if(id==="@/store/store-service")return upstream??service;
  if(id==="../validation"||id==="../../validation")return validation;
  throw new Error(`Unexpected import ${id}`);
 },URL,Response,Error});
 return {route:exp,calls};
}

const image={id:"7346d93d-ff39-44b0-81b8-d25191f4a616",url:"/media/products/tomato.webp",width:1600,height:1200,variants:[{url:"https://cdn.example/tomato-640.webp",width:640,height:480}]};
const category={id:"e55e4778-0528-4594-a4bf-cab97007c50f",parent_id:null,slug:"vegetables",sort_order:2,name:"Vegetables",requested_locale:"en",content_locale:"en",is_fallback:false};
const csaQuotaGroup={id:"b2027dcb-49cc-4610-b57d-586d5a0f02b8",name:"Vegetables",cost:1};
const product={id:"5a9ec50d-0dc7-4dbc-a9db-202c5436420f",slug:"tomato",sku:"TOMATO",name:"Tomato",alternate_name:"Cà chua",short_description:"Fresh",retail_price_vnd:45000,available_quantity:10,unit_size:"1.000",unit_label:"kg",category:{id:category.id,slug:category.slug,name:category.name},primary_image:image,csa_quota_group:csaQuotaGroup,suppliers:[{id:"28e3d9cc-5bef-469f-a1de-dc77f2c5dac7",name:"Farm A"}],requested_locale:"en",content_locale:"en",available_locales:["en","vi"],is_fallback:false};

test("Store runtime parsers accept the exact public contract and normalize safe media URLs",()=>{
 const model=loadModel();
 const categories=model.parseStoreCategories({data:[{...category,slug:"root_vegetables"}]});
 assert.equal(categories[0].name,"Vegetables");
 const page=model.parseStorePage({data:[product],meta:{page:1,page_size:12,total:1}});
 assert.equal(page.data[0].primary_image.url,"https://naturalfarmingvietnam.com/media/products/tomato.webp");
 assert.equal(page.data[0].retail_price_vnd,45000);
 assert.equal(page.data[0].available_quantity,10);
 assert.deepEqual(JSON.parse(JSON.stringify(page.data[0].csa_quota_group)),csaQuotaGroup);
 const retailPage=model.parseStorePage({data:[{...product,csa_quota_group:null}],meta:{page:1,page_size:12,total:1}});
 assert.equal(retailPage.data[0].csa_quota_group,null);
 const detail=model.parseStoreProductDetail({data:{...product,description:"Harvested today",suppliers:[{...product.suppliers[0],location:"Da Lat"}]}});
 assert.equal(detail.description,"Harvested today");
 assert.equal(detail.suppliers[0].location,"Da Lat");
});

test("Store unit quantities omit insignificant decimal zeroes",()=>{
 const format=runModule("src/store/store-format.ts");
 assert.equal(format.formatUnitSize("500.000"),"500");
 assert.equal(format.formatUnitSize("0.500"),"0.5");
 assert.equal(format.formatUnitSize("1.250"),"1.25");
 assert.equal(format.formatUnitSize("1.001"),"1.001");
});

test("Store CSA quota badges localize points without changing the group name",()=>{
 const format=runModule("src/store/store-format.ts");
 assert.equal(format.formatCsaQuotaBadge({...csaQuotaGroup,name:"Rau"},"vi"),"CSA – Rau – 1 điểm");
 assert.equal(format.formatCsaQuotaBadge(csaQuotaGroup,"en"),"CSA – Vegetables – 1 point");
 assert.equal(format.formatCsaQuotaBadge({...csaQuotaGroup,cost:2},"en"),"CSA – Vegetables – 2 points");
});

test("Store runtime parsers reject malformed envelopes, money, locale and unsafe images",()=>{
 const model=loadModel();
 for(const payload of [
  {wrong:[]},
  {data:[{...product,retail_price_vnd:"45000"}],meta:{page:1,page_size:12,total:1}},
  {data:[{...product,requested_locale:"fr"}],meta:{page:1,page_size:12,total:1}},
  {data:[{...product,primary_image:{...image,url:"javascript:alert(1)"}}],meta:{page:1,page_size:12,total:1}},
  {data:[{...product,csa_quota_group:{...csaQuotaGroup,id:"bad"}}],meta:{page:1,page_size:12,total:1}},
  {data:[{...product,csa_quota_group:{...csaQuotaGroup,name:""}}],meta:{page:1,page_size:12,total:1}},
  {data:[{...product,csa_quota_group:{...csaQuotaGroup,cost:0}}],meta:{page:1,page_size:12,total:1}},
  {data:[{...product,csa_quota_group:{...csaQuotaGroup,cost:1.555}}],meta:{page:1,page_size:12,total:1}},
  {data:[product],meta:{page:0,page_size:12,total:1}},
 ])assert.throws(()=>model.parseStorePage(payload));
 assert.throws(()=>model.parseStoreCategories({data:[{...category,id:"bad"}]}));
 assert.throws(()=>model.parseStoreProductDetail({data:product}));
});

test("catalog and product detail keep the full safe-integer availability from the API",()=>{
 const model=loadModel();
 const detail={...product,description:"",suppliers:[{...product.suppliers[0],location:"Da Lat"}]};
 for(const available_quantity of [0,1,999,1000,2147483647,2147483648,3000000000,Number.MAX_SAFE_INTEGER]){
  assert.equal(model.parseStorePage({data:[{...product,available_quantity}],meta:{page:1,page_size:12,total:1}}).data[0].available_quantity,available_quantity);
  assert.equal(model.parseStoreProductDetail({data:{...detail,available_quantity}}).available_quantity,available_quantity);
 }
 for(const available_quantity of [-1,1.5,"3000000000",Number.MAX_SAFE_INTEGER+1]){
  assert.throws(()=>model.parseStoreProductDetail({data:{...detail,available_quantity}}));
 }
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
 const list=loadService({result:{data:[product],meta:{page:2,page_size:12,total:13}}});
 await list.service.fetchStoreProducts({locale:"en",search:"tomato",sort:"price_asc",page:2,pageSize:12},{bypassCache:false});
 assert.equal(list.calls[0].url,"http://127.0.0.1:8000/api/v1/public/store-products?locale=en&search=tomato&sort=price_asc&page=2&page_size=12");
 assert.deepEqual(JSON.parse(JSON.stringify(list.calls[0].init.next)),{revalidate:300,tags:["store-products"]});
 const detail=loadService({result:{data:{...product,requested_locale:"vi",is_fallback:true,description:"Full",suppliers:[{...product.suppliers[0],location:"Da Lat"}]}}});
 await detail.service.fetchStoreProduct("tomato","vi",{bypassCache:false});
 assert.equal(detail.calls[0].url,"http://127.0.0.1:8000/api/v1/public/store-products/tomato?locale=vi");
 assert.deepEqual(JSON.parse(JSON.stringify(detail.calls[0].init.next)),{revalidate:300,tags:["store-product-details","store-product:tomato"]});
});

test("the public Store keeps a zero-stock product in the catalog and detail",async()=>{
 const soldOut={...product,available_quantity:0};
 const list=loadService({result:{data:[soldOut],meta:{page:1,page_size:12,total:1}}});
 const detail=loadService({result:{data:{...soldOut,description:"Harvested today",suppliers:[]}}});
 const catalog=await list.service.fetchStoreProducts({locale:"en",sort:"default",page:1,pageSize:12});
 assert.equal(catalog.meta.total,1);
 assert.equal(catalog.data[0].id,product.id);
 assert.equal(catalog.data[0].available_quantity,0);
 const {data}=await detail.service.fetchStoreProduct(product.slug,"en");
 assert.equal(data.id,product.id);
 assert.equal(data.available_quantity,0);
});

test("a discontinued product's fresh detail response stays a 404 through the Store BFF and page",async()=>{
 const {service,calls}=loadService({status:404});
 const {route}=runRoute("app/api/store/products/[slug]/route.ts",{upstream:service});
 const response=await route.GET(new Request("http://localhost/api/store/products/tomato?locale=en&retry=1"),{params:Promise.resolve({slug:"tomato"})});
 assert.equal(response.status,404);
 assert.deepEqual(await response.json(),{error:"not_found"});
 assert.equal(response.headers.get("cache-control"),"no-store");

 const notFound=new Error("not_found");
 const publicRequest=runModule("src/lib/public-request.ts");
 const page=runModule("app/store/[segment]/[locale]/page.tsx",id=>{
  if(id==="react")return require("react");
  if(id==="next/navigation")return {notFound:()=>{throw notFound}};
  if(id==="@/lib/public-request")return publicRequest;
  if(id==="@/store/store-service")return service;
  return {};
 });
 const pageInput={params:Promise.resolve({segment:"tomato",locale:"en"}),searchParams:Promise.resolve({retry:"1"})};
 await assert.rejects(()=>page.default(pageInput),error=>error===notFound);
 assert.deepEqual(Object.keys(await page.generateMetadata(pageInput)),[]);
 assert.equal(calls.length,3);
 for(const call of calls){
  assert.equal(call.url,"http://127.0.0.1:8000/api/v1/public/store-products/tomato?locale=en");
  assert.equal(call.init.cache,"no-store");
 }
});

test("product page and metadata share a fresh request without sharing data across renders or locales",async()=>{
 const detail={...product,description:"Harvested today",suppliers:product.suppliers.map(supplier=>({...supplier,location:"Đà Lạt"}))};
 const {service,calls}=loadService({result:url=>({data:{...detail,requested_locale:url.searchParams.get("locale"),is_fallback:url.searchParams.get("locale")!=="en"}})});
 const serverReact=require(join(dirname(require.resolve("react/package.json")),"cjs/react.react-server.development.js"));
 const internals=serverReact.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
 const jsx=(type,props)=>({type,props});
 const page=runModule("app/store/[segment]/[locale]/page.tsx",id=>{
  if(id==="react")return serverReact;
  if(id==="react/jsx-runtime")return {jsx};
  if(id==="@/lib/public-request")return runModule("src/lib/public-request.ts");
  if(id==="@/lib/public-metadata")return {storeProductMetadata:data=>({title:data.name})};
  if(id==="@/store/store-service")return service;
  return {};
 });
 const original=internals.A;
 function openRender(){
  // The RSC dispatcher owns one React cache for the current render.
  const values=new Map();
  internals.A={getCacheForType(factory){
   if(!values.has(factory))values.set(factory,factory());
   return values.get(factory);
  }};
 }
 function input(locale,retry="1"){
  return {params:Promise.resolve({segment:product.slug,locale}),searchParams:Promise.resolve(retry?{retry}:{})};
 }
 try{
  openRender();
  const [metadata,tree]=await Promise.all([page.generateMetadata(input("en")),page.default(input("en"))]);
  assert.equal(metadata.title,product.name);
  assert.equal(tree.props.children.props.product.id,product.id);
  assert.equal(calls.length,1);
  assert.equal(calls[0].init.cache,"no-store");
  assert.ok(calls[0].init.signal instanceof AbortSignal);

  await page.default(input("vi"));
  await page.default(input("en",""));
  assert.equal(calls.length,3);
  assert.match(calls[1].url,/locale=vi$/);
  assert.deepEqual(Array.from(calls[2].init.next.tags),["store-product-details",`store-product:${product.slug}`]);

  openRender();
  await page.default(input("en"));
  assert.equal(calls.length,4);
 }finally{
  internals.A=original;
 }
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

test("Store catalog accepts fractional CSA costs while stock and VND remain integers",()=>{
 const model=loadModel();
 for(const cost of [.25,.5,.1,1]){
  const parsed=model.parseStorePage({data:[{...product,csa_quota_group:{...csaQuotaGroup,cost}}],meta:{page:1,page_size:12,total:1}});
  assert.equal(parsed.data[0].csa_quota_group.cost,cost);
 }
 for(const cost of ["0.25",NaN,Infinity,.001,-.25]) assert.throws(()=>model.parseStorePage({data:[{...product,csa_quota_group:{...csaQuotaGroup,cost}}],meta:{page:1,page_size:12,total:1}}));
 for(const field of ["available_quantity","retail_price_vnd"])assert.throws(()=>model.parseStorePage({data:[{...product,[field]:.25}],meta:{page:1,page_size:12,total:1}}));
});

test("Store BFF preserves zero and restored stock for the same Product across supplier changes",async()=>{
 const farmA={...product.suppliers[0],name:"Bình Minh",location:"Đà Lạt"};
 const farmB={id:"bcc839eb-b0e7-47e8-ad13-6d7bc70c41c6",name:"Tân Lập",location:"Lâm Đồng"};
 // Response-consumption fixtures. The Backend lifecycle suite owns the stock calculation.
 for(const [stock,farms] of [[10,[farmA,farmB]],[4,[farmB]],[0,[]],[3,[farmA]]]){
  for(const locale of ["vi","en"]){
   const card={...product,name:locale==="vi"?"Cà chua":"Tomato",requested_locale:locale,content_locale:locale,
    available_quantity:stock,suppliers:farms.map(({id,name})=>({id,name}))};
   const detail={...card,description:"Harvested today",suppliers:farms};
   const meta={page:1,page_size:12,total:1};
   const listUpstream=loadService({result:{data:[card],meta}});
   const detailUpstream=loadService({result:{data:detail}});
   const listRoute=runRoute("app/api/store/products/route.ts",{upstream:listUpstream.service}).route;
   const detailRoute=runRoute("app/api/store/products/[slug]/route.ts",{upstream:detailUpstream.service}).route;
   const list=await listRoute.GET(new Request(`http://localhost/api/store/products?locale=${locale}`));
   const item=await detailRoute.GET(new Request(`http://localhost/api/store/products/${product.slug}?locale=${locale}&retry=1`),{params:Promise.resolve({slug:product.slug})});
   assert.equal(list.status,200);
   assert.equal(item.status,200);
   assert.equal(item.headers.get("cache-control"),"no-store");
   const listing=await list.json();
   const view=await item.json();
   assert.deepEqual(listing.meta,meta);
   assert.equal(listing.data.length,1);
   assert.deepEqual(listing.data[0].suppliers,card.suppliers);
   assert.deepEqual(view.data.suppliers,farms);
   for(const row of [listing.data[0],view.data]){
    for(const key of ["id","slug","sku","retail_price_vnd","unit_size","unit_label"]){
     assert.equal(row[key],product[key]);
    }
    assert.equal(row.requested_locale,locale);
    assert.equal(row.available_quantity,stock);
   }
  }
 }
});
