import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const intentUrl = new URL("../src/account/redemption-intent.ts", import.meta.url).href;
const presentationUrl = new URL("../src/account/redemption-presentation.ts", import.meta.url).href;
const stateUrl = new URL("../src/account/redemption-state.ts", import.meta.url).href;
const copyUrl = new URL("../src/data/account-copy.ts", import.meta.url).href;

function run(script) {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--input-type=module", "--eval", script],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test("one redemption intent keeps one idempotency key through retries", () => {
  run(`
    import assert from 'node:assert/strict';
    const intent=await import(${JSON.stringify(intentUrl)});
    let generated=0;
    const current=intent.beginRedemptionIntent('reward-1',()=>{generated+=1;return '11111111-1111-4111-8111-111111111111'});
    assert.deepEqual(current,{giftId:'reward-1',idempotencyKey:'11111111-1111-4111-8111-111111111111',phase:'confirm'});
    assert.equal(intent.redemptionRequest(current).idempotencyKey,'11111111-1111-4111-8111-111111111111');
    assert.equal(intent.redemptionRequest({...current,phase:'error'}).idempotencyKey,'11111111-1111-4111-8111-111111111111');
    assert.equal(generated,1);
  `);
});

test("redemption statuses and backend failures have explicit localized presentation", () => {
  run(`
    import assert from 'node:assert/strict';
    const presentation=await import(${JSON.stringify(presentationUrl)});
    const copy=await import(${JSON.stringify(copyUrl)});
    assert.deepEqual(presentation.redemptionStatus('contacted'),{copyKey:'rewards.statusContacted',tone:'pending'});
    assert.deepEqual(presentation.redemptionStatus('rejected'),{copyKey:'rewards.statusRejected',tone:'error'});
    assert.equal(presentation.redemptionErrorCopyKey('insufficient_points'),'rewards.errorInsufficient');
    assert.equal(presentation.redemptionErrorCopyKey('reward_inactive'),'rewards.errorUnavailable');
    assert.equal(presentation.redemptionErrorCopyKey('network_error'),'rewards.errorRetry');
    assert.equal(copy.copyText('vi','rewards.statusContacted'),'Đã liên hệ');
    assert.equal(copy.copyText('en','rewards.errorInsufficient'),'You no longer have enough points for this gift.');
  `);
});

test("successful redemption updates balance and total without duplicating an idempotent replay", () => {
  run(`
    import assert from 'node:assert/strict';
    const state=await import(${JSON.stringify(stateUrl)});
    const initial={balance:250,gifts:[],history:[],redemptions:[],pagination:{redemptions:{nextCursor:null,total:0}}};
    const redemption={id:'redeem-1',date:'2026-10-23T00:00:00Z',giftName:'Gift',points:100,status:'pending'};
    const created=state.applyRedemptionResult(initial,{balance:150,redemption});
    assert.equal(created.balance,150);
    assert.deepEqual(created.redemptions,[redemption]);
    assert.equal(created.pagination.redemptions.total,1);
    const replayed=state.applyRedemptionResult(created,{balance:150,redemption});
    assert.deepEqual(replayed.redemptions,[redemption]);
    assert.equal(replayed.pagination.redemptions.total,1);
  `);
});

