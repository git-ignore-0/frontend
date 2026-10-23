import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

function load(path, requireStub, globals = {}) {
  assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
  const code = ts.transpileModule(readFileSync(join(root, path), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: requireStub,
    URL,
    Headers,
    Request,
    Response,
    AbortSignal,
    DOMException,
    ...globals,
  });
  return exports;
}

test("account BFF only allows the reward endpoints used by v1", () => {
  const { accountUpstreamTarget } = load("src/account/bff-path.ts", () => ({}));
  const target = (path, method) => JSON.parse(JSON.stringify(accountUpstreamTarget(path, method)));
  assert.deepEqual(target(["rewards"], "GET"), {
    path: "/api/v1/public/rewards",
    session: "none",
    query: "localized-page",
  });
  assert.deepEqual(target(["account"], "GET"), {
    path: "/api/v1/referrals/account",
    session: "required",
    query: "none",
  });
  assert.deepEqual(target(["points"], "GET"), {
    path: "/api/v1/referrals/points",
    session: "required",
    query: "page",
  });
  assert.deepEqual(target(["redemptions"], "GET"), {
    path: "/api/v1/referrals/redemptions",
    session: "required",
    query: "localized-page",
  });
  assert.deepEqual(target(["redemptions"], "POST"), {
    path: "/api/v1/referrals/redemptions",
    session: "required",
    query: "none",
  });
  assert.deepEqual(target(["invited-users"], "GET"), {
    path: "/api/v1/referrals/invited-users",
    session: "required",
    query: "page",
  });
  assert.deepEqual(target(["submit-code"], "POST"), {
    path: "/api/v1/referrals/submit-code",
    session: "required",
    query: "none",
  });
  assert.equal(accountUpstreamTarget(["submit-code"], "GET"), null);
  assert.equal(accountUpstreamTarget(["admin", "redemptions"], "GET"), null);
  assert.equal(accountUpstreamTarget(["redemptions", "uuid"], "GET"), null);
  assert.equal(accountUpstreamTarget(["rewards"], "POST"), null);
});

function routeHarness({ session = null } = {}) {
  const calls = [];
  let cleared = 0;
  const route = load("app/api/account/[...path]/route.ts", (id) => {
    if (id === "next/server") return {
      NextResponse: class NextResponse extends Response {
        static json(body, init) {
          return new Response(JSON.stringify(body), {
            ...init,
            headers: { "Content-Type": "application/json", ...init?.headers },
          });
        }
      },
    };
    if (id === "@/account/bff-path") {
      const paths = load("src/account/bff-path.ts", () => ({}));
      return paths;
    }
    if (id === "@/auth/server/config") return {
      authOrigin: () => "http://127.0.0.1:8000",
      publicSiteOrigin: () => "http://localhost:3000",
    };
    if (id === "@/auth/server/oauth") return {
      AuthServiceUnavailableError: class AuthServiceUnavailableError extends Error {},
      currentPublicSession: async (value) => value,
      sessionTokensChanged: () => false,
    };
    if (id === "@/auth/server/session") return {
      clearSession: async () => { cleared += 1; },
      readSession: async () => session,
      writeSession: async () => {},
    };
    throw new Error(`Unexpected import ${id}`);
  }, {
    fetch: async (target, init) => {
      calls.push({ target: String(target), init });
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  return { route, calls, cleared: () => cleared };
}

test("account BFF rejects unauthenticated private reads and cross-origin mutations", async () => {
  const guest = routeHarness();
  const privateRead = new Request("http://localhost:3000/api/account/redemptions?page=1");
  const unauthorized = await guest.route.GET(privateRead, {
    params: Promise.resolve({ path: ["redemptions"] }),
  });
  assert.equal(unauthorized.status, 401);
  assert.equal(guest.calls.length, 0);

  const signedIn = routeHarness({
    session: { accessToken: "access", refreshToken: "refresh", expiresAt: Date.now() + 60_000 },
  });
  const attack = new Request("http://localhost:3000/api/account/redemptions", {
    method: "POST",
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    body: JSON.stringify({ reward_id: "a", idempotency_key: "b" }),
  });
  const forbidden = await signedIn.route.POST(attack, {
    params: Promise.resolve({ path: ["redemptions"] }),
  });
  assert.equal(forbidden.status, 403);
  assert.equal(signedIn.calls.length, 0);
});

test("account BFF forwards the bearer token but never exposes it to the browser response", async () => {
  const harness = routeHarness({
    session: { accessToken: "secret-access", refreshToken: "refresh", expiresAt: Date.now() + 60_000 },
  });
  const request = new Request("http://localhost:3000/api/account/redemptions?locale=en&page=2");
  const response = await harness.route.GET(request, {
    params: Promise.resolve({ path: ["redemptions"] }),
  });
  assert.equal(response.status, 200);
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].target, "http://127.0.0.1:8000/api/v1/referrals/redemptions?locale=en&page=2");
  assert.equal(harness.calls[0].init.headers.Authorization, "Bearer secret-access");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal((await response.text()).includes("secret-access"), false);
});

