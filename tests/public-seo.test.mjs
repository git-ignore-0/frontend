import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {dirname,join,resolve} from "node:path";
import test from "node:test";
import {fileURLToPath,pathToFileURL} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const helperPath=join(root,"src/lib/sitemap-workshops.ts");

function run(script){
  const result=spawnSync(process.execPath,["--experimental-strip-types","--input-type=module","--eval",script],{encoding:"utf8"});
  assert.equal(result.status,0,result.stderr||result.stdout);
}

test("workshop sitemap loader returns only indexable localized workshop records",()=>{
  assert.equal(existsSync(helperPath),true,"sitemap workshop loader must exist");
  run(`
    import assert from 'node:assert/strict';
    const api=await import(${JSON.stringify(pathToFileURL(helperPath).href)});
    const rows=[
      {id:'1',slug:'soil-life',title:'Soil life',summary:'A',start_at:'2026-10-20T00:00:00Z',end_at:'2026-10-20T01:00:00Z',status:'completed',is_fallback:false},
      {id:'2',slug:'fallback',title:'Fallback',summary:'B',start_at:'2026-10-21T00:00:00Z',end_at:'2026-10-21T01:00:00Z',status:'upcoming',is_fallback:true},
      {id:'broken',slug:'',title:'Broken',start_at:'bad',status:'upcoming'},
    ];
    const fetcher=async()=>({ok:true,json:async()=>({data:rows,meta:{total:3,page_size:50}})});
    assert.deepEqual(await api.getSitemapWorkshops('https://api.example','en',fetcher),[{slug:'soil-life'}]);
  `);
});

test("workshop sitemap loader degrades to an empty list when content API fails",()=>{
  assert.equal(existsSync(helperPath),true,"sitemap workshop loader must exist");
  run(`
    import assert from 'node:assert/strict';
    const api=await import(${JSON.stringify(pathToFileURL(helperPath).href)});
    const fetcher=async()=>{throw new Error('offline')};
    assert.deepEqual(await api.getSitemapWorkshops('https://api.example','vi',fetcher),[]);
  `);
});

test("workshop sitemap loader follows backend pagination beyond ten pages",()=>{
  assert.equal(existsSync(helperPath),true,"sitemap workshop loader must exist");
  run(`
    import assert from 'node:assert/strict';
    const api=await import(${JSON.stringify(pathToFileURL(helperPath).href)});
    let upcomingCalls=0;
    const fetcher=async url=>{
      const parsed=new URL(url);
      if(parsed.searchParams.get('period')==='past') throw new Error('past unavailable');
      const page=Number(parsed.searchParams.get('page'));upcomingCalls++;
      const row={id:String(page),slug:'workshop-'+page,title:'Workshop '+page,summary:'A',start_at:'2026-10-20T00:00:00Z',end_at:'2026-10-20T01:00:00Z',status:'completed',is_fallback:false};
      return {ok:true,json:async()=>({data:[row],meta:{total:550,page_size:50}})};
    };
    const items=await api.getSitemapWorkshops('https://api.example','en',fetcher);
    assert.equal(upcomingCalls,11);
    assert.equal(items.length,11);
    assert.equal(items.at(-1).slug,'workshop-11');
  `);
});

test("Next exposes v1-localized sitemap and robots metadata routes",()=>{
  const sitemapPath=join(root,"app/sitemap.ts"),robotsPath=join(root,"app/robots.ts");
  assert.equal(existsSync(sitemapPath),true,"sitemap route must exist");
  assert.equal(existsSync(robotsPath),true,"robots route must exist");
  const sitemap=readFileSync(sitemapPath,"utf8");
  assert.match(sitemap,/\/workshops\/\$\{encodeURIComponent\(item\.slug\)\}\/\$\{locale\}/);
  for(const path of ["about","plants","animals","workshops","tracker","testimonials","csa","store"]){
    assert.match(sitemap,new RegExp(`"/${path}"`));
  }
  assert.doesNotMatch(sitemap,/account|checkout|share\/ref|privacy-policy|term-conditions/);
  assert.doesNotMatch(sitemap,/lastModified|startAt/);
  const robots=readFileSync(robotsPath,"utf8");
  assert.match(robots,/sitemap\.xml/);
  assert.match(robots,/allow:\s*"\/"/);
  assert.match(robots,/disallow:\s*\["\/api\/","\/ref\/"\]/);
  assert.doesNotMatch(robots,/\/share\/ref\//);
});

test("account and compatibility auth pages declare noindex metadata",()=>{
  for(const relative of ["app/account/[locale]/page.tsx","app/login/[locale]/page.tsx","app/register/[locale]/page.tsx"]){
    const source=readFileSync(join(root,relative),"utf8");
    assert.match(source,/robots:\s*\{\s*index:false,follow:false\s*\}/,`${relative} must be noindex`);
  }
});
