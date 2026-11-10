import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
import test from "node:test";

const require=createRequire(import.meta.url),ts=require("typescript");
const cache=new Map();
function load(path){
 if(cache.has(path))return cache.get(path);
 const exports={};cache.set(path,exports);
 vm.runInNewContext(ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,URL,require:id=>{
  if(id==="react/jsx-runtime")return require(id);
  if(id==="next/image")return {default:props=>{const imageProps={...props};delete imageProps.unoptimized;return require("react").createElement("img",imageProps)}};
  if(id==="@/lib/workshop-rich-text")return load("src/lib/workshop-rich-text.ts");
  if(id==="@/components/workshops/WorkshopRichText")return load("src/components/workshops/WorkshopRichText.tsx");
  if(id==="../lib/csa-units.ts")return load("src/lib/csa-units.ts");
  if(id==="@/config/site-brand")return {SITE_ORIGIN:"https://naturalfarmingvietnam.com"};
  throw Error(id);
 }});return exports;
}
const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const render=props=>renderToStaticMarkup(React.createElement(load("src/components/store/StoreProductDescription.tsx").StoreProductDescription,props));
const doc=content=>({type:"doc",content});
const text=value=>({type:"text",text:value});
const p=value=>({type:"paragraph",content:[text(value)]});
const product={id:"11111111-1111-4111-8111-111111111111",slug:"rau",sku:"RAU",name:"Rau",alternate_name:null,short_description:"",retail_price_vnd:35000,available_quantity:10,unit_size:"1.000",unit_label:"kg",category:{id:"22222222-2222-4222-8222-222222222222",slug:"rau",name:"Rau"},primary_image:null,csa_quota_group:null,suppliers:[],requested_locale:"en",content_locale:"vi",available_locales:["vi"],is_fallback:true,description:"Old"};

test("detail parser keeps rich content and supports old responses",()=>{
 const model=load("src/store/store-model.ts");
 assert.equal(model.parseStoreProductDetail({data:product}).description_document,null);
 const document=doc([p("Tiếng Việt")]);
 const result=model.parseStoreProductDetail({data:{...product,description_document:document}});
 assert.deepEqual(JSON.parse(JSON.stringify(result.description_document)),document);
 assert.equal(result.content_locale,"vi");assert.equal(result.requested_locale,"en");
 for(const value of ["bad",[],{},doc({}),doc([{type:"image"}]),doc([{type:"paragraph",content:[{type:"text",text:22}]}])])assert.throws(()=>model.parseStoreProductDetail({data:{...product,description_document:value}}));
});

test("legacy paragraphs preserve literal text and line breaks",()=>{
 const html=render({description:"<script>alert(1)</script>\nSecond\n\nLast",heading:"Thông tin sản phẩm"});
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/store-product-description-legacy/);assert.match(html,/Second\n\nLast/);
});

test("saved rich content replaces fallback and renders all supported formatting",()=>{
 const document=doc([{type:"heading",attrs:{level:3},content:[text("Bảo quản")]},{type:"paragraph",content:[{...text("Mát"),marks:[{type:"bold"},{type:"italic"}]},{type:"hardBreak"},text("Khô")]},{type:"orderedList",attrs:{start:3,type:null},content:[{type:"listItem",content:[p("Một")]}]},{type:"bulletList",content:[{type:"listItem",content:[p("Hai")]}]}]);
 const parsed=load("src/store/store-model.ts").parseStoreProductDetail({data:{...product,description_document:document}});
 assert.equal(parsed.description_document.content[2].attrs.type,null);
 const html=render({description:"OLD MUST NOT APPEAR",document:parsed.description_document,heading:"Product information"});
 assert.match(html,/<h3><span>Bảo quản<\/span><\/h3>/);assert.match(html,/<em><strong>Mát<\/strong><\/em>/);assert.match(html,/<br\/>/);assert.match(html,/<ol start="3">/);assert.match(html,/<ul>/);assert.doesNotMatch(html,/OLD MUST/);
});

test("empty documents do not revive old text or an empty heading",()=>{
 for(const document of [doc([]),doc([{type:"paragraph"}]),{type:"doc"}])assert.equal(render({description:"Old",document,heading:"Info"}),"");
 assert.equal(render({description:"",document:null,heading:"Info"}),"");
});

test("product renderer rejects unsafe links and unsupported media while Workshop stays compatible",()=>{
 const rich=load("src/components/workshops/WorkshopRichText.tsx");
 const unsafe=doc([{type:"paragraph",content:[{...text("Bad"),marks:[{type:"link",attrs:{href:"javascript:alert(1)"}}]},{...text("Safe"),marks:[{type:"link",attrs:{href:"https://example.com/path"}}]}]},{type:"image",attrs:{src:"https://example.com/image.webp"}},{type:"blockquote",content:[p("Quote")]}]);
 const html=render({description:"",document:unsafe,heading:"Info"});
 assert.doesNotMatch(html,/javascript:|<img|<blockquote|Quote/);assert.match(html,/href="https:\/\/example.com\/path"/);
 const workshop=renderToStaticMarkup(React.createElement(rich.WorkshopRichText,{document:unsafe}));
 assert.match(workshop,/class="wk-prose"/);assert.match(workshop,/<blockquote>/);assert.match(workshop,/<img/);
});


test("detail parsing bounds product content before recursive rendering",()=>{
 const model=load("src/store/store-model.ts");
 const nested=depth=>depth?{type:"bulletList",content:[{type:"listItem",content:[nested(depth-1)]}]}:p("End");
 for(const invalid of [doc([p("x".repeat(10001))]),doc(Array.from({length:2001},()=>p(""))),doc([nested(20)])])assert.throws(()=>model.parseStoreProductDetail({data:{...product,description_document:invalid}}));
});

test("numbered lists beginning at zero keep their start in public output",()=>{
 const document=doc([{type:"orderedList",attrs:{start:0,type:null},content:[{type:"listItem",content:[p("Zero")]}]}]);
 const parsed=load("src/store/store-model.ts").parseStoreProductDetail({data:{...product,description_document:document}});
 assert.match(render({description:"",document:parsed.description_document,heading:"Info"}),/<ol start="0">/);
});

// Resolve the relevant CSS cascade, including margin shorthand, without a browser.
function productStyle(selectors,property){
 const css=require("postcss").parse(readFileSync("app/styles/81-store-commerce.css","utf8"));
 let winner;
 css.walkRules(rule=>{
  if(rule.parent.type==="atrule")return;
  for(const selector of rule.selectors){
   if(!selectors.includes(selector))continue;
   const classes=(selector.match(/\.[\w-]+|:[\w-]+/g)||[]).length;
   const tags=(selector.match(/(?:^|[\s>+])(?:h[234]|p|li)(?=[\s>+.:#]|$)/g)||[]).length;
   rule.walkDecls(declaration=>{
    let value;
    if(declaration.prop===property)value=declaration.value;
    else if(declaration.prop==="margin"&&property.startsWith("margin-")){
     const parts=declaration.value.split(/\s+/);
     value=property==="margin-top"?parts[0]:parts[2]??parts[0];
    }
    if(value===undefined)return;
    if(!winner||classes>winner.classes||classes===winner.classes&&tags>=winner.tags)winner={classes,tags,value};
   });
  }
 });
 return winner?.value;
}

test("product headings preserve whitespace from the editor",()=>{
 for(const tag of ["h2","h3","h4"]){
  const whitespace=productStyle([".store-product-information .store-product-prose",`.store-product-information .store-product-prose ${tag}`],"white-space");
  assert.ok(["pre-wrap","break-spaces"].includes(whitespace),tag);
 }
});

test("product spacing overrides win over base paragraph and heading margins",()=>{
 assert.equal(productStyle([".store-product-information .store-product-prose p",".store-product-prose li>p",".store-product-information .store-product-prose li>p"],"margin-bottom"),".35em");
 assert.equal(productStyle([".store-product-information .store-product-prose h2",".store-product-prose>:first-child",".store-product-information .store-product-prose>:first-child"],"margin-top"),"0");
 assert.equal(productStyle([".store-product-information .store-product-prose p",".store-product-prose>:last-child",".store-product-information .store-product-prose>:last-child"],"margin-bottom"),"0");
});
