import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const shareUrl = new URL(
  "../src/account/referral-share.ts",
  import.meta.url,
).href;

function run(script) {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "--eval", script],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("referral sharing builds a localized same-site invitation URL", () => {
  run(`
    import assert from 'node:assert/strict';
    const share=await import(${JSON.stringify(shareUrl)});
    assert.equal(
      share.buildReferralUrl('https://naturalfarmingvietnam.com/', 'NFV 123/456', 'vi'),
      'https://naturalfarmingvietnam.com/ref/NFV%20123%2F456?locale=vi',
    );
  `);
});

test("referral sharing keeps exactly one invitation URL in edited messages", () => {
  run(`
    import assert from 'node:assert/strict';
    const share=await import(${JSON.stringify(shareUrl)});
    const url='https://naturalfarmingvietnam.com/ref/NFV2345678?locale=en';
    assert.equal(share.messageWithReferralUrl('Join me',url),'Join me\\n'+url);
    assert.equal(share.messageWithReferralUrl('Join me '+url,url),'Join me '+url);
    assert.equal(share.messageWithReferralUrl('First '+url+' duplicate '+url,url),'First '+url+' duplicate');
    assert.equal(share.messageWithReferralUrl('',url),url);
  `);
});

test("referral sharing builds encoded desktop platform targets", () => {
  run(`
    import assert from 'node:assert/strict';
    const share=await import(${JSON.stringify(shareUrl)});
    const referralUrl='https://naturalfarmingvietnam.com/ref/NFV2345678?locale=en';
    const targets=share.buildReferralShareTargets({
      origin:'https://naturalfarmingvietnam.com',
      code:'NFV2345678',
      locale:'en',
      message:'Join Natural Farming Vietnam',
      emailSubject:'Discover Natural Farming Vietnam',
    });
    const facebook=new URL(targets.facebook);
    assert.equal(facebook.origin+facebook.pathname,'https://www.facebook.com/sharer/sharer.php');
    assert.equal(facebook.searchParams.get('u'),referralUrl);
    assert.equal(facebook.searchParams.has('text'),false);
    const whatsapp=new URL(targets.whatsapp);
    assert.equal(whatsapp.origin+whatsapp.pathname,'https://wa.me/');
    assert.equal(whatsapp.searchParams.get('text'),'Join Natural Farming Vietnam\\n'+referralUrl);
    const email=new URL(targets.email);
    assert.equal(email.protocol,'mailto:');
    assert.equal(email.searchParams.get('subject'),'Discover Natural Farming Vietnam');
    assert.equal(email.searchParams.get('body'),'Join Natural Farming Vietnam\\n'+referralUrl);
  `);
});
