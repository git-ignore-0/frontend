import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const serviceUrl = new URL("../src/account/referrals-service.ts", import.meta.url).href;
const presentationUrl = new URL("../src/account/referral-presentation.ts", import.meta.url).href;
const stateUrl = new URL("../src/account/referral-state.ts", import.meta.url).href;
const copyUrl = new URL("../src/data/account-copy.ts", import.meta.url).href;
const benefitsSource = readFileSync(
  new URL("../src/screens/AccountBenefits.tsx", import.meta.url),
  "utf8",
);
const benefitsStyles = readFileSync(
  new URL("../app/styles/96-account-benefits.css", import.meta.url),
  "utf8",
);
const shareDialogPath = new URL(
  "../src/components/account/ReferralShareDialog.tsx",
  import.meta.url,
);
const shareDialogSource = existsSync(shareDialogPath)
  ? readFileSync(shareDialogPath, "utf8")
  : "";

function run(script) {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "--eval", script],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("referral service maps account summary and invited users into the v1 model", () => {
  run(`
    import assert from 'node:assert/strict';
    const service=await import(${JSON.stringify(serviceUrl)});
    const payloads={
      '/api/account/account':{data:{referral_code:'NFV2345678',referrer:{id:'user-1',name:'Nguyen Van A'},can_submit_referral_code:false,points_balance:100,invited_count:31}},
      '/api/account/invited-users?page=1':{data:[{id:'user-2',name:'Safe Name',status:'joined',referred_at:'2026-10-20T00:00:00Z'}],meta:{page:1,page_size:30,total:31}},
    };
    globalThis.fetch=async (path,options)=>new Response(JSON.stringify(payloads[path]),{status:200,headers:{'Content-Type':'application/json'}});
    const result=await service.getReferrals();
    assert.equal(result.code,'NFV2345678');
    assert.deepEqual(result.referrer,{id:'user-1',name:'Nguyen Van A'});
    assert.equal(result.canEnterReferrer,false);
    assert.equal(result.invitedCount,31);
    assert.deepEqual(result.invitees,[{id:'user-2',name:'Safe Name',status:'recorded',date:'2026-10-20T00:00:00Z'}]);
    assert.deepEqual(result.pagination.invitees,{nextCursor:'2',total:31});
  `);
});

test("referral service submits a normalized code and preserves backend error codes", () => {
  run(`
    import assert from 'node:assert/strict';
    const service=await import(${JSON.stringify(serviceUrl)});
    let submitted;
    globalThis.fetch=async (_path,options)=>{submitted=JSON.parse(options.body);return new Response(JSON.stringify({data:{referral_code:'NFV2345679',referrer:{id:'user-1',name:'Referrer'},can_submit_referral_code:false,points_balance:0,invited_count:0}}),{status:200,headers:{'Content-Type':'application/json'}})};
    const result=await service.applyReferralCode({code:'  nfv2345678  '});
    assert.deepEqual(submitted,{code:'NFV2345678'});
    assert.deepEqual(result.referrer,{id:'user-1',name:'Referrer'});
    assert.equal(result.canEnterReferrer,false);
    globalThis.fetch=async()=>new Response(JSON.stringify({errors:[{code:'self_referral'}]}),{status:400,headers:{'Content-Type':'application/json'}});
    await assert.rejects(()=>service.applyReferralCode({code:'NFV2345678'}),error=>error.code==='self_referral'&&error.status===400);
  `);
});

test("referral input and API failures use the real Core format and localized messages", () => {
  run(`
    import assert from 'node:assert/strict';
    const presentation=await import(${JSON.stringify(presentationUrl)});
    const copy=await import(${JSON.stringify(copyUrl)});
    assert.equal(presentation.normalizeReferralCode('  nfv2345678 '),'NFV2345678');
    assert.equal(presentation.isReferralCode('NFV2345678'),true);
    assert.equal(presentation.isReferralCode('INVALID'),false);
    assert.equal(presentation.isReferralCode('NFV01IOABC'),false);
    assert.equal(presentation.referralErrorCopyKey('invalid_referral_code'),'ref.invalidCode');
    assert.equal(presentation.referralErrorCopyKey('self_referral'),'ref.selfReferral');
    assert.equal(presentation.referralErrorCopyKey('referrer_already_assigned'),'ref.alreadyReferred');
    assert.equal(copy.copyText('vi','ref.selfReferral'),'Bạn không thể dùng mã giới thiệu của chính mình.');
    assert.equal(copy.copyText('en','ref.invalidCode'),'This referral code is invalid.');
  `);
});

test("applying a referrer preserves the invited-user page already loaded", () => {
  run(`
    import assert from 'node:assert/strict';
    const state=await import(${JSON.stringify(stateUrl)});
    const current={code:'NFV2345678',canEnterReferrer:true,referrer:null,invitedCount:1,invitees:[{id:'u2',name:'Friend',status:'recorded',date:'2026-10-20'}],pagination:{invitees:{nextCursor:null,total:1}}};
    const summary={code:'NFV2345678',canEnterReferrer:false,referrer:{id:'u1',name:'Referrer'},invitedCount:1};
    assert.deepEqual(state.mergeReferralSummary(current,summary),{...current,...summary});
  `);
});

test("invited friend presentation hides the internal UUID", () => {
  run(`
    import assert from 'node:assert/strict';
    const presentation=await import(${JSON.stringify(presentationUrl)});
    const row=presentation.referralInvitePresentation(
      {id:'603d15be-6d15-4d46-9b22-b1ed57d5e9e4',name:'Nguyen Van A',status:'recorded',date:'2026-07-29'},
      '29/07/2026',
    );
    assert.deepEqual(row,{title:'Nguyen Van A',meta:'29/07/2026'});
    assert.equal(row.meta.includes('603d15be-6d15-4d46-9b22-b1ed57d5e9e4'),false);
  `);
});

test("referral program steps and point conditions use the full v2 copy", () => {
  assert.match(benefitsSource, /L\("ref\.howOneTitle"\)/);
  assert.match(benefitsSource, /L\("ref\.howOneBody"\)/);
  assert.match(benefitsSource, /L\("ref\.conditionFive"\)/);
  assert.match(
    benefitsSource,
    /<\/BenefitSection>\s*<BenefitSection title=\{L\("ref\.terms"\)\}>/,
  );
  assert.match(benefitsSource, /className="benefit-how referral-program-list referral-condition-list"/);
  assert.doesNotMatch(benefitsSource, /ref\.termsEn|ref\.terms\|\|/);

  run(`
    import assert from 'node:assert/strict';
    const copy=await import(${JSON.stringify(copyUrl)});
    assert.equal(copy.copyText('vi','ref.howTitle'),'Chương trình hoạt động thế nào?');
    assert.equal(copy.copyText('vi','ref.howOneTitle'),'Chia sẻ mã mời');
    assert.equal(copy.copyText('vi','ref.howOneBody'),'Gửi mã mời cá nhân cho người bạn tin tưởng.');
    assert.equal(copy.copyText('vi','ref.howThreeBody'),'Đội ngũ xác nhận đơn đủ điều kiện và cộng 100 điểm vào tài khoản của bạn.');
    assert.equal(copy.copyText('vi','ref.terms'),'Điều kiện nhận điểm');
    assert.equal(copy.copyText('vi','ref.conditionTwo'),'Đơn đầu tiên phải được thanh toán, giao thành công và có giá trị từ 300.000₫.');
    assert.equal(copy.copyText('vi','ref.conditionFive'),'Điểm hết hạn sau 12 tháng kể từ đơn hàng hoặc lần đổi quà gần nhất.');
    assert.equal(copy.copyText('en','ref.terms'),'Conditions for earning points');
    assert.equal(copy.copyText('en','ref.conditionTwo'),'Their first order must be paid, delivered and worth at least 300,000₫.');
  `);
});

test("referral program stays balanced before and after linking a referrer", () => {
  assert.match(benefitsSource, /className="acc-section benefit-section referral-program-card"/);
  assert.match(benefitsSource, /className="referral-personal-row"/);
  assert.match(benefitsSource, /className="referral-earnings-row"/);
  assert.match(benefitsSource, /className="referral-referrer-row"/);
  assert.ok(benefitsSource.indexOf("referral-personal-row") < benefitsSource.indexOf("referral-earnings-row"));
  assert.ok(benefitsSource.indexOf("referral-earnings-row") < benefitsSource.indexOf("referral-referrer-row"));
  assert.doesNotMatch(benefitsSource, /referral-program-overview|referral-earnings-card/);
  assert.match(benefitsSource, /L\("ref\.earningsTitle"\)/);
  assert.match(benefitsSource, /L\("ref\.successfulPoints"\)/);
  assert.match(benefitsSource, /L\("ref\.secondOrderBonus"\)/);
  assert.match(
    benefitsStyles,
    /\.referral-earnings-list\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
  );
  assert.match(
    benefitsStyles,
    /@container \(max-width:559px\)\{[^}]*\.referral-earnings-list\{grid-template-columns:minmax\(0,1fr\);?/s,
  );
  assert.match(
    benefitsStyles,
    /\.referral-code-entry>\.btn\{[^}]*flex:0 1 auto;[^}]*white-space:normal;[^}]*overflow-wrap:anywhere/,
  );
  assert.match(
    benefitsStyles,
    /\.referral-part-body \.benefit-code-actions \.btn\{[^}]*flex:0 1 auto;[^}]*white-space:normal;[^}]*overflow-wrap:anywhere/,
  );

  run(`
    import assert from 'node:assert/strict';
    const copy=await import(${JSON.stringify(copyUrl)});
    assert.equal(copy.copyText('vi','ref.earningsTitle'),'Bạn nhận được gì');
    assert.equal(copy.copyText('vi','ref.successfulPoints'),'100 điểm');
    assert.equal(copy.copyText('vi','ref.successfulLabel'),'cho mỗi lượt giới thiệu thành công');
    assert.equal(copy.copyText('vi','ref.secondOrderBonus'),'+50 điểm');
    assert.equal(copy.copyText('vi','ref.secondOrderLabel'),'khi người bạn giới thiệu đặt đơn thứ hai trong vòng 60 ngày');
    assert.equal(copy.copyText('en','ref.earningsTitle'),'What you earn');
    assert.equal(copy.copyText('en','ref.successfulPoints'),'100 points');
    assert.equal(copy.copyText('en','ref.secondOrderBonus'),'+50 points');
  `);
});

test("referral sharing opens a dedicated dialog built from v1 primitives", () => {
  assert.match(benefitsSource, /<ReferralShareDialog code=\{code\} locale=\{ui\.locale\}/);
  assert.doesNotMatch(benefitsSource, /navigator\.share/);
  assert.match(shareDialogSource, /ResponsiveDialog/);
  assert.match(shareDialogSource, /<Button small onClick=/);
  assert.match(shareDialogSource, /<ActionLink/);
  assert.match(shareDialogSource, /copyTextToClipboard/);
  assert.match(shareDialogSource, /buildReferralShareTargets/);
  assert.match(shareDialogSource, /copyValue\(normalizedMessage,"message"\)/);
  assert.match(shareDialogSource, /descriptionId=\{descriptionId\}/);
});

test("referral share responsive detection is hydration-safe", () => {
  assert.match(shareDialogSource, /useSyncExternalStore/);
  assert.match(shareDialogSource, /getServerShareSurface/);
  assert.doesNotMatch(shareDialogSource, /useState<boolean\|null>\(initialMobileShareSurface\)/);
});

test("referral share dialog uses localized v2 flow copy", () => {
  run(`
    import assert from 'node:assert/strict';
    const copy=await import(${JSON.stringify(copyUrl)});
    assert.equal(copy.copyText('vi','ref.shareDialogTitle'),'Chia sẻ liên kết giới thiệu');
    assert.equal(copy.copyText('vi','ref.shareDialogDescription'),'Hãy dùng nút sao chép liên kết hoặc sao chép tin nhắn bên dưới để chia sẻ với bạn bè bằng cách dán vào ứng dụng nhắn tin hoặc email.');
    assert.equal(copy.copyText('vi','ref.copyLink'),'Sao chép liên kết');
    assert.equal(copy.copyText('vi','ref.copyMessage'),'Sao chép tin nhắn');
    assert.equal(copy.copyText('en','ref.shareDialogTitle'),'Share your referral link');
    assert.equal(copy.copyText('en','ref.shareDialogDescription'),'Use the copy link or copy message below to share with your friends by pasting into your messaging app or email.');
  `);
});

test("referral share dialog CSS stays namespaced and responsive", () => {
  assert.match(benefitsStyles, /\.referral-share-dialog \.filter-sheet-inner/);
  assert.match(benefitsStyles, /\.referral-share-field/);
  assert.match(benefitsStyles, /\.referral-share-platforms/);
  assert.match(benefitsStyles, /@media\(max-width:600px\)[\s\S]*\.referral-share-dialog/);
  assert.doesNotMatch(benefitsStyles, /\n\.btn\{[^}]*referral-share/);
});
