import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const model=await import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(read('src/screens/tracker/tracker-model.ts')))}`);
const farm=(count,oneMonth=2)=>({id:'farm-1',name:'Farm',location:'Vietnam',description:'',signup_count:count,one_month_signup_count:oneMonth,sort_order:1,image:null,images:[]});

test('tracker has exactly one local page and correct localized routes',()=>{
 assert.ok(existsSync(new URL('app/tracker/[locale]/page.tsx',root)));
 assert.match(read('app/tracker/[locale]/page.tsx'),/initialPage="tracker"/);
 assert.match(read('src/data/main-navigation.ts'),/screen:"tracker"/);
 assert.match(read('app/NFVApp.tsx'),/ui\.page==="tracker"\?<TrackerPage\/>/);
});
test('farm milestone transitions match original 0 10 20 30 rules',()=>{
 for(const [count,key,next,remaining] of [[0,'seedPlanted','gettingStarted',10],[9,'seedPlanted','gettingStarted',1],[10,'gettingStarted','providingForFamily',10],[20,'providingForFamily','communityLeader',10],[30,'communityLeader',null,0],[80,'communityLeader',null,0]]){
  const m=model.farmView(farm(count));assert.equal(m.milestone.key,key);assert.equal(m.nextMilestone?.key??null,next);assert.equal(m.remaining,remaining);
  assert.ok(m.progress>=0&&m.progress<=100);
 }
});
test('stats are computed only from real farms; invalid count values never leak',()=>{
 assert.deepEqual(model.trackerStats([]),{farms:0,oneMonth:0,sixMonth:0,leaders:0});
 assert.deepEqual(model.trackerStats([farm(30,1),farm(20,3)]),{farms:2,oneMonth:4,sixMonth:50,leaders:1});
 assert.equal(model.normalizeCount(Number.NaN),0);
});
test('public tracker contract rejects malformed payloads and unsafe images',()=>{
 assert.deepEqual(model.parseTrackerFarms({data:[farm(10)]}),[farm(10)]);
 assert.throws(()=>model.parseTrackerFarms({wrong:[]}));
 assert.throws(()=>model.parseTrackerFarms({data:[{...farm(0),signup_count:'10'}]}));
 assert.throws(()=>model.parseTrackerFarms({data:[{...farm(0),image:{id:'i',url:'javascript:alert(1)',width:300,height:200}}]}));
});
test('tracker API uses only configured backend and distinguishes failure from empty',()=>{
 const route=read('app/api/tracker-farms/route.ts');
 assert.match(route,/getPublicContentOrigin/);assert.match(route,/\/api\/v1\/public\/tracker-farms\?locale=/);
 assert.match(route,/parseTrackerFarms/);assert.match(route,/status:\s*503/);assert.match(route,/status:\s*502/);
 assert.doesNotMatch(route,/Ka Sa Salime|Bến Tre Demonstration Farm|mockFarms/);
});
test('tracker style is namespace-scoped and does not reset site header/footer',()=>{
 const css=read('app/styles/11-tracker.css');
 assert.match(css,/\.nfv-tracker\.tracker-standalone/);
 assert.match(css,/@media\s*\(max-width:\s*900px\)/);
 assert.match(css,/@media\s*\(max-width:\s*680px\)/);
 assert.match(css,/@media\s*\(max-width:\s*380px\)/);
 assert.doesNotMatch(css,/\.site-header\b|\.site-footer\b|\.account-nav-shell\b|\.checkout-form\b/);
 assert.match(read('app/layout.tsx'),/11-tracker\.css/);
});

// The status card appears right after the stats on loading/error/empty states.
// Both status and populated content must have the same section spacing.
test('tracker status card uses the same section gap as ready content without global CSS overrides',()=>{
 const css=read('app/styles/11-tracker.css');
 assert.match(css,/--tracker-section-gap:\s*clamp\(22px,3vw,32px\)/);
 assert.match(css,/\.nfv-tracker \.tracker-field-section\s*\{[^}]*margin:\s*var\(--tracker-section-gap\) 0;/s);
 assert.match(css,/\.nfv-tracker \.tracker-state\s*\{[^}]*margin-top:\s*var\(--tracker-section-gap\);/s);
 assert.doesNotMatch(css,/(?:^|\n)\s*\.tracker-state\s*\{/);
});
