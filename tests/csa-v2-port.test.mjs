import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read=(name)=>fs.readFileSync(path.join(process.cwd(),name),'utf8');

test('CSA V2 sections and localized copy are ported in their original order',()=>{
 const source=read('src/screens/CSAProgram.tsx');
 const positions=['csa-v2-hero','copy.comparisons.map','<CsaPackages','csa-v2-timeline','<CsaFaq','csa-v2-help'];
 let last=-1;for(const item of positions){const index=source.indexOf(item);assert.ok(index>last,`missing/out-of-order ${item}`);last=index;}
 const content=read('src/data/csa-content.ts');
 for(const marker of ['Thực phẩm tươi mỗi tuần','Fresh food each week','why-natural-farming','why-csa','Các gói đang mở đăng ký','Packages open for registration','monday-availability.jpg','friday-delivery.jpg','faqItems','zalo.me/84988158285'])assert.ok(content.includes(marker),`missing V2 content ${marker}`);
});
test('CSA reuses V62 shared Button, DataState, assets and configuration',()=>{
 const source=['src/screens/CSAProgram.tsx','src/screens/csa/CsaComparison.tsx','src/screens/csa/CsaPackages.tsx','src/screens/csa/CsaFaq.tsx'].map(read).join('\n');
 for(const marker of ['Button','DataState','siteImageSrc','CsaSectionHeading'])assert.ok(source.includes(marker));
 assert.match(read('app/api/csa-packages/route.ts'),/getPublicContentOrigin/);
 assert.match(read('app/api/csa-packages/route.ts'),/\/api\/v1\/public\/membership-packages/);
});
test('Scoped CSA stylesheet preserves V2 responsive structure and V62 tokens',()=>{
 const css=read('app/styles/13-csa.css');
 assert.match(css,/\.nfv-csa/);
 assert.match(css,/@media\(min-width:1024px\)/);
 assert.match(css,/@media\(max-width:1023px\)/);
 assert.match(css,/@media\(min-width:768px\)/);
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/var\(--csa-surface-radius\)/);
 assert.match(css,/var\(--bg\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(read('app/layout.tsx'),/13-csa\.css/);
});
test('Public package data validates payloads and cancels obsolete requests',()=>{
 assert.match(read('src/screens/csa/csa-packages-model.ts'),/parseCsaPackages/);
 assert.match(read('src/screens/csa/useCsaPackages.ts'),/AbortController/);
 assert.match(read('src/screens/csa/CsaPackages.tsx'),/kind="error"/);
 assert.match(read('src/screens/csa/CsaPackages.tsx'),/kind="loading"/);
});
