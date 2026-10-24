import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";

const root=new URL("../",import.meta.url);
const require=createRequire(import.meta.url);
const ts=require("typescript");
const read=path=>readFileSync(new URL(path,root),"utf8");

function transpile(path,{jsx=false}={}){
  return ts.transpileModule(read(path),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,...(jsx?{jsx:ts.JsxEmit.ReactJSX}:{})},
  }).outputText;
}

function jsonResponse(body,init={}){
  return new Response(JSON.stringify(body),{...init,headers:{"Content-Type":"application/json"}});
}

const publicRequest={};
vm.runInNewContext(transpile("src/lib/public-request.ts"),{exports:publicRequest,require:()=>({})});

function runWorkshopRoute({origin="http://127.0.0.1:8000",fetchPage}={}){
  const exports={};
  const calls=[];
  const fetchPublicWorkshopJson=async (url,options)=>{
    calls.push({url,options});
    return fetchPage?fetchPage(new URL(url)):({data:[],meta:{page:1,page_size:50,total:0}});
  };
  vm.runInNewContext(transpile("app/api/workshops/route.ts"),{
    exports,URL,Response,Request,
    require:id=>{
      if(id==="next/server")return {NextResponse:{json:jsonResponse}};
      if(id==="@/lib/public-workshop")return {
        fetchPublicWorkshopJson,
        getPublicContentOrigin:()=>origin,
        parsePublicWorkshops:payload=>payload.data,
      };
      if(id==="@/lib/public-request")return publicRequest;
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return {route:exports,calls};
}

function loadWorkshopServer(fetchPublicWorkshopJson,getPublicContentOrigin=()=>"https://api.test",parsePublicWorkshop=value=>value){
  const exports={};
  const PublicWorkshopFetchError=class PublicWorkshopFetchError extends Error{
    constructor(status,message){super(message);this.status=status;}
  };
  vm.runInNewContext(transpile("src/lib/workshop-server.ts"),{
    exports,
    require:id=>{
      if(id==="server-only")return {};
      if(id==="@/lib/public-workshop")return {
        fetchPublicWorkshopJson,
        getPublicContentOrigin,
        parsePublicWorkshop,
        PublicWorkshopFetchError,
      };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  return {server:exports,PublicWorkshopFetchError};
}

function findElement(node,predicate){
  if(!node||typeof node!=="object")return null;
  if(predicate(node))return node;
  const children=node.props?.children;
  for(const child of Array.isArray(children)?children:[children]){
    const found=findElement(child,predicate);
    if(found)return found;
  }
  return null;
}

test("root route permanently redirects to the canonical Vietnamese URL",()=>{
  const exports={};
  const permanentRedirect=href=>{throw new Error(`REDIRECT:${href}`)};
  vm.runInNewContext(transpile("app/page.tsx",{jsx:true}),{
    exports,
    require:id=>{
      if(id==="next/navigation")return {permanentRedirect};
      if(id==="react/jsx-runtime")return require("react/jsx-runtime");
      if(id==="./NFVApp")return {NFVApp:()=>null};
      if(id==="@/lib/public-metadata")return {publicPageMetadata:()=>({})};
      throw new Error(`Unexpected import ${id}`);
    },
  });
  assert.throws(()=>exports.default(),/REDIRECT:\/vi/);
});

test("workshop BFF returns an error instead of treating one failed period as empty",async()=>{
  const {route}=runWorkshopRoute({fetchPage:url=>{
    if(url.searchParams.get("period")==="upcoming")throw new Error("upstream failed");
    return {data:[],meta:{page:1,page_size:50,total:0}};
  }});
  const response=await route.GET(new Request("http://site.test/api/workshops?locale=vi"));
  assert.equal(response.status,502);
  assert.deepEqual(await response.json(),{error:"upstream_unavailable"});
});

test("workshop BFF reports missing backend configuration",async()=>{
  const {route}=runWorkshopRoute({origin:null});
  const response=await route.GET(new Request("http://site.test/api/workshops?locale=vi"));
  assert.equal(response.status,503);
  assert.deepEqual(await response.json(),{error:"configuration"});
});

test("workshop BFF follows pagination metadata beyond page ten",async()=>{
  const {route,calls}=runWorkshopRoute({fetchPage:url=>{
    const page=Number(url.searchParams.get("page"));
    const period=url.searchParams.get("period");
    return {data:[{id:`${period}-${page}`}],meta:{page,page_size:50,total:550}};
  }});
  const response=await route.GET(new Request("http://site.test/api/workshops?locale=en"));
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.upcoming.length,11);
  assert.equal(body.past.length,11);
  assert.ok(calls.some(call=>call.url.includes("period=upcoming")&&call.url.includes("page=11")));
  assert.ok(calls.some(call=>call.url.includes("period=past")&&call.url.includes("page=11")));
});

test("workshop retry bypasses the cached upstream response",async()=>{
  const {route,calls}=runWorkshopRoute();
  const response=await route.GET(new Request("http://site.test/api/workshops?locale=vi&retry=3"));
  assert.equal(response.status,200);
  assert.equal(calls.length,2);
  assert.ok(calls.every(call=>call.options.bypassCache===true));
});

test("workshop BFF rejects malformed retry values",async()=>{
  const {route,calls}=runWorkshopRoute();
  const response=await route.GET(new Request("http://site.test/api/workshops?locale=vi&retry=forever"));
  assert.equal(response.status,400);
  assert.equal(calls.length,0);
});

test("workshop detail returns null only for a real upstream 404",async()=>{
  let MissingError;
  const missingResult=loadWorkshopServer(async()=>{throw new MissingError(404,"missing")});
  MissingError=missingResult.PublicWorkshopFetchError;
  assert.equal(await missingResult.server.getPublicWorkshop("missing","vi"),null);

  let UnavailableError;
  const unavailableResult=loadWorkshopServer(async()=>{throw new UnavailableError(503,"unavailable")});
  UnavailableError=unavailableResult.PublicWorkshopFetchError;
  await assert.rejects(()=>unavailableResult.server.getPublicWorkshop("living-soil","vi"),/unavailable/);
});

test("workshop detail rejects a malformed successful upstream payload",async()=>{
  const {server}=loadWorkshopServer(async()=>({data:{invalid:true}}),undefined,()=>null);
  await assert.rejects(()=>server.getPublicWorkshop("living-soil","vi"),/Invalid public workshop payload/);
});

test("Workshop error state exposes a retry action",()=>{
  let retries=0;
  const DataState=()=>null;
  const exports={};
  vm.runInNewContext(transpile("src/screens/workshops/WorkshopsPage.tsx",{jsx:true}),{
    exports,
    require:id=>{
      if(id==="react/jsx-runtime")return require("react/jsx-runtime");
      if(id==="@/state/NFVContext")return {useNFV:()=>({ui:{locale:"vi"}})};
      if(id==="@/data/workshop-copy")return {WORKSHOP_COPY:{vi:{title:"Workshop",intro:"Intro",unavailable:"Error",retry:"Try again"}}};
      if(id==="@/components/UI")return {DataState};
      if(id==="./useWorkshops")return {useWorkshops:()=>({upcoming:[],past:[],state:"error",retry:()=>{retries+=1}})};
      if(id==="@/components/workshops/WorkshopCard")return {WorkshopCard:()=>null};
      throw new Error(`Unexpected import ${id}`);
    },
  });
  const tree=exports.WorkshopsPage();
  const state=findElement(tree,node=>node.type===DataState);
  assert.equal(state.props.action.label,"Try again");
  state.props.action.onClick();
  assert.equal(retries,1);
});

test("Plants About CTA leaves navigation semantics to its native anchor",()=>{
  const exports={};
  vm.runInNewContext(transpile("src/screens/plants/PlantsPage.tsx",{jsx:true}),{
    exports,
    require:id=>{
      if(id==="react/jsx-runtime")return require("react/jsx-runtime");
      if(id==="@/state/NFVContext")return {useNFV:()=>({ui:{locale:"vi"}})};
      if(id==="@/data/knowledge-content")return {PLANT_INPUTS:[],PLANTS_COPY:{vi:{label:"Plants",title:"Title",intro:"Intro",alt:"",toc:["1","2","3","4","5","6"],sections:Array.from({length:6},(_,index)=>({index:String(index),title:String(index)})),paragraphs:Array(8).fill("Text"),figureAlt:["",""] ,cta:"About"}}};
      if(id==="@/components/editorial/PageHero")return {PageHero:()=>null};
      if(id==="@/components/knowledge/KnowledgeLayout")return {KnowledgeLayout:({children})=>children,KnowledgeSection:({children})=>children};
      if(id==="@/components/knowledge/KnowledgeContent")return {KnowledgePhoto:()=>null,KnowledgeTable:()=>null,LegacyFigure:()=>null};
      throw new Error(`Unexpected import ${id}`);
    },
  });
  const tree=exports.PlantsPage();
  const anchor=findElement(tree,node=>node.type==="a");
  assert.equal(anchor.props.href,"/about/vi");
  assert.equal(anchor.props.onClick,undefined);
});
