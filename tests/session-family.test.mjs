import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
const require = createRequire(import.meta.url),
  ts = require("typescript");
function harness() {
  const scope = new AsyncLocalStorage(),
    browser = new Map(),
    exports = {};
  const sessionSource = ts.transpileModule(readFileSync("src/auth/server/session.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(sessionSource, {
    exports,
    Buffer,
    process: { env: { NODE_ENV: "test" } },
    require: (name) =>
      name === "server-only"
        ? {}
        : name === "node:crypto"
          ? require(name)
          : name === "next/headers"
            ? { cookies: async () => scope.getStore() }
            : name === "@/auth/server/config"
              ? {
                  sessionSecret: () => "test-only-session-secret-32-characters",
                }
              : {},
  });
  const begin = (task) => {
    const snapshot = new Map(browser),
      writes = [];
    const store = {
      get: (name) => (snapshot.has(name) ? { value: snapshot.get(name) } : undefined),
      getAll: () => [...snapshot].map(([name, value]) => ({ name, value })),
      set(name, value, options) {
        writes.push({ name, value, options });
        snapshot.set(name, value);
      },
      delete(name) {
        writes.push({ name, value: null });
        snapshot.delete(name);
      },
    };
    return {
      result: scope.run(store, task),
      apply() {
        for (const { name, value } of writes)
          if (value === null) browser.delete(name);
          else browser.set(name, value);
      },
      writes,
    };
  };
  const run = async (task) => {
    const request = begin(task);
    const result = await request.result;
    request.apply();
    return result;
  };
  return { session: exports, browser, begin, run };
}
const payload = (token) => ({
  accessToken: token,
  refreshToken: `refresh-${token}`,
  expiresAt: Date.now() + 3600000,
  user: { sub: token },
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test("a delayed refresh of login A cannot overwrite login B", async () => {
  const h = harness();
  await h.run(() => h.session.startSession(payload("A")));
  const hold = deferred();
  const old = h.begin(async () => {
    const a = await h.session.readSession();
    await hold.promise;
    await h.session.writeSession({ ...a, accessToken: "rotated-A" });
  });
  await h.run(() => h.session.startSession(payload("B")));
  hold.resolve();
  await old.result;
  old.apply();
  assert.equal((await h.run(() => h.session.readSession())).accessToken, "B");
});
test("an old 401 clears only A and preserves both B and B's OAuth flow", async () => {
  const h = harness();
  await h.run(() => h.session.startSession(payload("A")));
  const hold = deferred();
  const old = h.begin(async () => {
    await hold.promise;
    await h.session.clearSession();
  });
  await h.run(() => h.session.startSession(payload("B")));
  await h.run(() =>
    h.session.writeOAuthFlow({
      state: "B-flow",
      verifier: "verifier",
      returnTo: "/account/vi",
      locale: "vi",
    }),
  );
  hold.resolve();
  await old.result;
  old.apply();
  assert.equal((await h.run(() => h.session.readSession())).accessToken, "B");
  assert.equal((await h.run(() => h.session.consumeOAuthFlow())).state, "B-flow");
});
test("legacy refresh or deletion cannot replace a new family, and logout never revives legacy data", async () => {
  const h = harness();
  await h.run(() => h.session.writeSession(payload("legacy-A")));
  assert.equal((await h.run(() => h.session.readSession())).accessToken, "legacy-A");
  const hold = deferred();
  const old = h.begin(async () => {
    const a = await h.session.readSession();
    await hold.promise;
    await h.session.writeSession({ ...a, accessToken: "late-legacy-A" });
  });
  await h.run(() => h.session.startSession(payload("B")));
  hold.resolve();
  await old.result;
  old.apply();
  assert.equal((await h.run(() => h.session.readSession())).accessToken, "B");
  await h.run(() => h.session.clearSession());
  assert.equal(await h.run(() => h.session.readSession()), null);
});
test("refreshing the active family survives reload and preserves cookie protections", async () => {
  const h = harness();
  await h.run(() => h.session.startSession(payload("A")));
  const first = await h.run(() => h.session.readSession());
  await h.run(() => h.session.writeSession({ ...first, accessToken: "fresh-A" }));
  const next = await h.run(() => h.session.readSession());
  assert.equal(next.accessToken, "fresh-A");
  assert.equal(next.sessionId, first.sessionId);
  const request = h.begin(() => h.session.writeSession(next));
  await request.result;
  assert.equal(request.writes.length, 1);
  assert.equal(request.writes[0].options.httpOnly, true);
  assert.equal(request.writes[0].options.sameSite, "lax");
});

test("a refresh response cannot restore a family after logout", async () => {
  const h = harness();
  await h.run(() => h.session.startSession(payload("A")));
  const hold = deferred();
  const old = h.begin(async () => {
    const a = await h.session.readSession();
    await hold.promise;
    await h.session.writeSession({ ...a, accessToken: "late-A" });
  });
  await h.run(() => h.session.clearSession());
  hold.resolve();
  await old.result;
  old.apply();
  assert.equal(await h.run(() => h.session.readSession()), null);
});

test("legacy logout blocks its delayed refresh and a later login still works", async () => {
  const h = harness();
  await h.run(() => h.session.writeSession(payload("legacy")));
  const hold = deferred();
  const old = h.begin(async () => {
    const legacy = await h.session.readSession();
    await hold.promise;
    await h.session.writeSession({ ...legacy, accessToken: "late-legacy" });
  });
  await h.run(() => h.session.clearSession());
  hold.resolve();
  await old.result;
  old.apply();
  assert.equal(await h.run(() => h.session.readSession()), null);
  await h.run(() => h.session.startSession(payload("B")));
  assert.equal((await h.run(() => h.session.readSession())).accessToken, "B");
});
