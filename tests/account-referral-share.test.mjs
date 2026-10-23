import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
      'https://naturalfarmingvietnam.com/share/ref/NFV%20123%2F456?locale=vi',
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
    const referralUrl='https://naturalfarmingvietnam.com/share/ref/NFV2345678?locale=en';
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

test("public referral landing keeps social preview separate from referral capture",()=>{
  const pagePath=join(root,"app/share/ref/[code]/page.tsx");
  const imagePath=join(root,"app/share/ref/[code]/opengraph-image/route.tsx");
  const contentPath=join(root,"src/account/referral-share-content.ts");
  assert.equal(existsSync(pagePath),true,"public referral share page must exist");
  assert.equal(existsSync(imagePath),true,"referral Open Graph route must exist");
  assert.equal(existsSync(contentPath),true,"localized referral share copy must exist");
  const page=readFileSync(pagePath,"utf8");
  assert.match(page,/isReferralCode/);
  assert.match(page,/robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
  assert.match(page,/\/ref\/\$\{encodeURIComponent\(code\)\}\?locale=\$\{locale\}/);
  const image=readFileSync(imagePath,"utf8");
  assert.match(image,/new ImageResponse/);
  assert.match(image,/width:\s*1200/);
  assert.match(image,/height:\s*630/);
});

test("referral share landing copy is complete in both locales",()=>{
  const contentUrl=new URL("../src/account/referral-share-content.ts",import.meta.url).href;
  run(`
    import assert from 'node:assert/strict';
    const content=await import(${JSON.stringify(contentUrl)});
    for(const locale of ['vi','en']){
      const copy=content.referralShareContent(locale);
      for(const key of ['eyebrow','title','description','cta','visualNote','imageAlt']) assert.ok(copy[key]);
    }
    assert.match(content.referralShareContent('vi').title,/Nông sản/);
    assert.match(content.referralShareContent('en').title,/Naturally grown/);
  `);
});
