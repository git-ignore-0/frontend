import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const serviceUrl = new URL("../src/account/rewards-service.ts", import.meta.url).href;

function run(script) {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "--eval", script],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("reward service maps Core account, catalog, points and redemptions into the v1 model", () => {
  run(`
    import assert from 'node:assert/strict';
    const service=await import(${JSON.stringify(serviceUrl)});
    const requests=[];
    const payloads={
      '/api/account/account':{data:{points_balance:250}},
      '/api/account/rewards?locale=en&page=1':{data:[{id:'reward-1',point_cost:100,image:{url:'https://auth.example/media/gift.jpg'},name:'Seasonal gift'}],meta:{page:1,page_size:30,total:31}},
      '/api/account/points?page=1':{data:[{id:'point-1',direction:'credit',amount:250,message:'Welcome',created_at:'2026-10-20T00:00:00Z'}],meta:{page:1,page_size:30,total:1,balance:250}},
      '/api/account/redemptions?locale=en&page=1':{data:[{id:'redeem-1',reward_name:'Old gift',reward_name_vi_snapshot:'Quà cũ',reward_name_en_snapshot:'Old gift',point_cost_snapshot:50,status:'contacted',created_at:'2026-10-21T00:00:00Z'}],meta:{page:1,page_size:30,total:1}},
    };
    globalThis.fetch=async (path,options)=>{requests.push({path,options});return new Response(JSON.stringify(payloads[path]),{status:200,headers:{'Content-Type':'application/json'}})};
    const result=await service.getRewards('en');
    assert.equal(result.balance,250);
    assert.deepEqual(result.gifts,[{id:'reward-1',name:'Seasonal gift',image:'https://auth.example/media/gift.jpg',points:100}]);
    assert.deepEqual(result.history,[{id:'point-1',date:'2026-10-20T00:00:00Z',description:'Welcome',points:250}]);
    assert.deepEqual(result.redemptions,[{id:'redeem-1',date:'2026-10-21T00:00:00Z',giftName:'Old gift',giftNameEn:'Old gift',points:50,status:'contacted'}]);
    assert.deepEqual(result.pagination.gifts,{nextCursor:'2',total:31});
    assert.equal(requests.every(item=>item.options.credentials==='same-origin'&&item.options.cache==='no-store'),true);
  `);
});

test("reward service preserves backend error codes and submits the caller idempotency key", () => {
  run(`
    import assert from 'node:assert/strict';
    const service=await import(${JSON.stringify(serviceUrl)});
    let submitted;
    globalThis.fetch=async (_path,options)=>{
      submitted={headers:options.headers,body:JSON.parse(options.body)};
      return new Response(JSON.stringify({data:{redemption:{id:'redeem-2',reward_name:'Gift',reward_name_vi_snapshot:'Quà',reward_name_en_snapshot:'Gift',point_cost_snapshot:100,status:'pending',created_at:'2026-10-23T00:00:00Z'},balance:150,idempotent_replay:false}}),{status:201,headers:{'Content-Type':'application/json'}});
    };
    const result=await service.redeemGift({giftId:'reward-1',idempotencyKey:'11111111-1111-4111-8111-111111111111',locale:'en'});
    assert.deepEqual(submitted.body,{reward_id:'reward-1',idempotency_key:'11111111-1111-4111-8111-111111111111'});
    assert.equal(submitted.headers['X-NFV-Public-Request'],'1');
    assert.equal(result.accepted,true);
    assert.equal(result.balance,150);
    assert.equal(result.redemption.status,'pending');

    globalThis.fetch=async()=>new Response(JSON.stringify({errors:[{code:'insufficient_points'}]}),{status:409,headers:{'Content-Type':'application/json'}});
    await assert.rejects(()=>service.redeemGift({giftId:'reward-1',idempotencyKey:'11111111-1111-4111-8111-111111111111',locale:'en'}),error=>error instanceof service.AccountApiError&&error.status===409&&error.code==='insufficient_points');
  `);
});

test("reward service rejects malformed successful payloads instead of showing empty data", () => {
  run(`
    import assert from 'node:assert/strict';
    const service=await import(${JSON.stringify(serviceUrl)});
    globalThis.fetch=async()=>new Response(JSON.stringify({data:{unexpected:true}}),{status:200,headers:{'Content-Type':'application/json'}});
    await assert.rejects(()=>service.getRewardGiftsPage({locale:'vi',cursor:'1',limit:8}),error=>error instanceof service.AccountApiError&&error.code==='invalid_response');
  `);
});

