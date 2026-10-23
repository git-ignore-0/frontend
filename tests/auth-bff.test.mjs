import assert from "node:assert/strict";
import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = (path) => readFileSync(join(root, path), "utf8");

function load(path, requireStub, globals = {}) {
  assert.equal(existsSync(join(root, path)), true, `${path} must exist`);
  const code = ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: requireStub,
    URL,
    URLSearchParams,
    Headers,
    Request,
    Response,
    AbortSignal,
    Buffer,
    process,
    crypto,
    ...globals,
  });
  return exports;
}

test("auth boundary validates Core payloads and rejects unsafe return targets", () => {
  const validation = load("src/auth/server/validation.ts", () => ({}));
  const user = {
    sub: "3f7d06cb-8d37-44d5-a5ab-1e284f9d37d9",
    name: "NFV Member",
    email: "member@example.com",
    email_verified: true,
    locale: "vi",
    status: "active",
    roles: ["member"],
    phone_number: "+84 912 345 678",
    date_of_birth: "1990-06-15",
  };
  assert.deepEqual(JSON.parse(JSON.stringify(validation.parseMeResponse({ data: user }))), user);
  assert.throws(() => validation.parseMeResponse({ data: { ...user, status: "suspended" } }));
  assert.throws(() => validation.parseMeResponse({ data: { ...user, email_verified: false } }));
  assert.throws(() => validation.parseMeResponse({ data: { ...user, phone_number: 84912345678 } }));
  assert.throws(() => validation.parseMeResponse({ data: { ...user, date_of_birth: "1990-02-31" } }));
  assert.deepEqual(
    JSON.parse(JSON.stringify(validation.parseMeResponse({
      data: { ...user, phone_number: "", date_of_birth: null },
    }))),
    { ...user, phone_number: "", date_of_birth: null },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(validation.parseTokenResponse({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
      token_type: "Bearer",
      scope: "profile email",
    }))),
    { access_token: "access", refresh_token: "refresh", expires_in: 3600, token_type: "Bearer", scope: "profile email" },
  );
  assert.throws(() => validation.parseTokenResponse({ access_token: "", expires_in: 0, token_type: "Bearer" }));
  assert.equal(validation.safeReturnTo("/account/vi?tab=profile", "/vi", "http://localhost:3000"), "/account/vi?tab=profile");
  for (const unsafe of ["https://evil.example", "//evil.example", "\\evil.example", "javascript:alert(1)"])
    assert.equal(validation.safeReturnTo(unsafe, "/vi", "http://localhost:3000"), "/vi", unsafe);
});

test("sealed auth cookies are confidential, tamper-evident and HttpOnly", async () => {
  const values = new Map();
  const writes = [];
  const store = {
    get: (name) => values.has(name) ? { value: values.get(name) } : undefined,
    set: (name, value, options) => { values.set(name, value); writes.push({ name, value, options }); },
    delete: (name) => values.delete(name),
  };
  const session = load("src/auth/server/session.ts", (id) => {
    if (id === "server-only") return {};
    if (id === "node:crypto") return { __esModule: true, default: crypto };
    if (id === "next/headers") return { cookies: async () => store };
    if (id === "@/auth/server/config") return { sessionSecret: () => "s".repeat(32) };
    throw new Error(`Unexpected import ${id}`);
  });
  const payload = { accessToken: "secret-access", refreshToken: "secret-refresh", expiresAt: 123, user: { sub: "uuid" } };
  await session.writeSession(payload);
  assert.equal(writes[0].name, "nfv_public_session");
  assert.equal(writes[0].options.httpOnly, true);
  assert.equal(writes[0].options.sameSite, "lax");
  assert.equal(writes[0].value.includes("secret-access"), false);
  assert.deepEqual(JSON.parse(JSON.stringify(await session.readSession())), payload);
  const sealed = writes[0].value;
  values.set("nfv_public_session", `${sealed.slice(0, -1)}${sealed.endsWith("a") ? "b" : "a"}`);
  assert.equal(await session.readSession(), null);
});

test("OAuth begin creates PKCE state and only redirects to the configured Core origin", async () => {
  let flow;
  let randomCalls = 0;
  const begin = load("src/auth/server/begin.ts", (id) => {
    if (id === "server-only") return {};
    if (id === "next/server") return { NextResponse: { redirect: (url) => ({ location: String(url) }) } };
    if (id === "@/auth/server/config") return {
      authOrigin: () => "http://127.0.0.1:8000",
      oauthClientId: () => "public-client",
      publicSiteOrigin: () => "http://localhost:3000",
    };
    if (id === "@/auth/server/oauth") return {
      PUBLIC_SCOPES: "profile email",
      pkceChallenge: (value) => `challenge:${value}`,
      randomUrlSafe: () => randomCalls++ === 0 ? "state" : "verifier",
    };
    if (id === "@/auth/server/session") return { writeOAuthFlow: async (value) => { flow = value; } };
    if (id === "@/account/referral-presentation") return { isReferralCode: (value) => value === "NFV2345678" };
    if (id === "@/auth/server/validation") return {
      parseLocale: (value) => value === "en" ? "en" : "vi",
      safeReturnTo: (value, fallback) => value?.startsWith("/") && !value.startsWith("//") ? value : fallback,
    };
    throw new Error(`Unexpected import ${id}`);
  });
  const response = await begin.beginOAuth({ nextUrl: new URL("http://localhost:3000/api/auth/register?locale=en&returnTo=%2Faccount%2Fen") }, { signup: true });
  const target = new URL(response.location);
  assert.equal(target.origin, "http://127.0.0.1:8000");
  assert.equal(target.pathname, "/oauth/authorize");
  assert.equal(target.searchParams.get("redirect_uri"), "http://localhost:3000/api/auth/callback");
  assert.equal(target.searchParams.get("scope"), "profile email");
  assert.equal(target.searchParams.get("screen_hint"), "signup");
  assert.deepEqual(JSON.parse(JSON.stringify(flow)), { state: "state", verifier: "verifier", returnTo: "/account/en", locale: "en" });
});

test("referred signup keeps the code in the encrypted OAuth flow and authorize request", async () => {
  let flow;
  let randomCalls = 0;
  const begin = load("src/auth/server/begin.ts", (id) => {
    if (id === "server-only") return {};
    if (id === "next/server") return { NextResponse: { redirect: (url) => ({ location: String(url) }) } };
    if (id === "@/auth/server/config") return {
      authOrigin: () => "http://127.0.0.1:8000",
      oauthClientId: () => "public-client",
      publicSiteOrigin: () => "http://localhost:3000",
    };
    if (id === "@/auth/server/oauth") return {
      PUBLIC_SCOPES: "profile email",
      pkceChallenge: (value) => `challenge:${value}`,
      randomUrlSafe: () => randomCalls++ === 0 ? "state" : "verifier",
    };
    if (id === "@/auth/server/session") return { writeOAuthFlow: async (value) => { flow = value; } };
    if (id === "@/auth/server/validation") return {
      parseLocale: (value) => value === "en" ? "en" : "vi",
      safeReturnTo: (value, fallback) => value?.startsWith("/") && !value.startsWith("//") ? value : fallback,
    };
    if (id === "@/account/referral-presentation") return { isReferralCode: (value) => value === "NFV2345678" };
    throw new Error(`Unexpected import ${id}`);
  });
  const response = await begin.beginOAuth(
    { nextUrl: new URL("http://localhost:3000/ref/NFV2345678?locale=vi") },
    { signup: true, referralCode: "NFV2345678", returnTo: "/account/vi?tab=referrals&ref=NFV2345678" },
  );
  const target = new URL(response.location);
  assert.equal(target.searchParams.get("referral_code"), "NFV2345678");
  assert.deepEqual(JSON.parse(JSON.stringify(flow)), {
    state: "state", verifier: "verifier", returnTo: "/account/vi?tab=referrals&ref=NFV2345678", locale: "vi", referralCode: "NFV2345678",
  });
});

test("public referral capture route validates codes and preserves referral context", async () => {
  let session = null;
  const route = load("app/ref/[code]/route.ts", (id) => {
    if (id === "next/server") return { NextResponse: { redirect: (url) => ({ location: String(url) }) } };
    if (id === "@/auth/server/config") return { publicSiteOrigin: () => "http://localhost:3000" };
    if (id === "@/auth/server/session") return { readSession: async () => session };
    if (id === "@/auth/server/begin") return { beginOAuth: async (_request, options) => ({ options }) };
    if (id === "@/auth/server/validation") return { parseLocale: (value) => value === "en" ? "en" : "vi" };
    if (id === "@/account/referral-presentation") return {
      normalizeReferralCode: (value) => value.trim().toUpperCase(),
      isReferralCode: (value) => value === "NFV2345678",
    };
    throw new Error(`Unexpected import ${id}`);
  });
  const request = { nextUrl: new URL("http://localhost:3000/ref/nfv2345678?locale=vi") };
  const anonymous = await route.GET(request, { params: Promise.resolve({ code: "nfv2345678" }) });
  assert.deepEqual(JSON.parse(JSON.stringify(anonymous.options)), {
    signup: true, referralCode: "NFV2345678", returnTo: "/account/vi?tab=referrals&ref=NFV2345678",
  });
  session = { accessToken: "token" };
  const signedIn = await route.GET(request, { params: Promise.resolve({ code: "nfv2345678" }) });
  assert.equal(signedIn.location, "http://localhost:3000/account/vi?tab=referrals&ref=NFV2345678");
  const invalid = await route.GET(request, { params: Promise.resolve({ code: "bad" }) });
  assert.equal(invalid.location, "http://localhost:3000/vi");
});

test("refresh verifies the rotated access token through Core /me before authenticating", async () => {
  const calls = [];
  const refreshedUser = {
    sub: "3f7d06cb-8d37-44d5-a5ab-1e284f9d37d9",
    name: "Fresh Profile",
    email: "fresh@example.com",
    email_verified: true,
    locale: "en",
    status: "active",
    roles: ["member"],
  };
  const oauth = load("src/auth/server/oauth.ts", (id) => {
    if (id === "server-only") return {};
    if (id === "node:crypto") return { __esModule: true, default: crypto };
    if (id === "@/auth/server/config") return {
      authOrigin: () => "http://127.0.0.1:8000",
      oauthClientId: () => "public-client",
      oauthClientSecret: () => "client-secret",
      publicSiteOrigin: () => "http://localhost:3000",
    };
    if (id === "@/auth/server/validation") return {
      parseTokenResponse: (value) => value,
      parseMeResponse: (value) => value.data,
    };
    throw new Error(`Unexpected import ${id}`);
  }, {
    fetch: async (input) => {
      const url = new URL(input);
      calls.push(url.pathname);
      if (url.pathname === "/oauth/token") {
        return new Response(JSON.stringify({
          access_token: "rotated-access",
          refresh_token: "rotated-refresh",
          expires_in: 3600,
          token_type: "Bearer",
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (url.pathname === "/api/v1/me") {
        return new Response(JSON.stringify({ data: refreshedUser }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    },
  });
  const current = await oauth.currentPublicSession({
    accessToken: "expired-access",
    refreshToken: "old-refresh",
    expiresAt: Date.now() - 1,
    user: { ...refreshedUser, name: "Stale Profile" },
  });
  assert.deepEqual(calls, ["/oauth/token", "/api/v1/me"]);
  assert.equal(current.accessToken, "rotated-access");
  assert.equal(current.user.name, "Fresh Profile");
});

test("refresh exposes rotated credentials when Core /me is transiently unavailable", async () => {
  const oauth = load("src/auth/server/oauth.ts", (id) => {
    if (id === "server-only") return {};
    if (id === "node:crypto") return { __esModule: true, default: crypto };
    if (id === "@/auth/server/config") return {
      authOrigin: () => "http://127.0.0.1:8000",
      oauthClientId: () => "public-client",
      oauthClientSecret: () => "client-secret",
      publicSiteOrigin: () => "http://localhost:3000",
    };
    if (id === "@/auth/server/validation") return {
      parseTokenResponse: (value) => value,
      parseMeResponse: (value) => value.data,
    };
    throw new Error(`Unexpected import ${id}`);
  }, {
    fetch: async (input) => {
      const pathname = new URL(input).pathname;
      if (pathname === "/oauth/token") {
        return new Response(JSON.stringify({
          access_token: "rotated-access",
          refresh_token: "rotated-refresh",
          expires_in: 3600,
          token_type: "Bearer",
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response("unavailable", { status: 503 });
    },
  });
  const staleUser = { sub: "uuid", name: "Stale Profile" };

  await assert.rejects(
    oauth.currentPublicSession({
      accessToken: "expired-access",
      refreshToken: "old-refresh",
      expiresAt: Date.now() - 1,
      user: staleUser,
    }),
    (error) => {
      assert.ok(error instanceof oauth.AuthServiceUnavailableError);
      assert.equal(error.rotatedSession?.accessToken, "rotated-access");
      assert.equal(error.rotatedSession?.refreshToken, "rotated-refresh");
      assert.equal(error.rotatedSession?.user, staleUser);
      return true;
    },
  );
});

test("OAuth callback failure consumes only its flow and preserves an established session", async () => {
  let clearCalls = 0;
  let exchangeCalls = 0;
  const callback = load("app/api/auth/callback/route.ts", (id) => {
    if (id === "next/server") return {
      NextResponse: { redirect: (url) => ({ location: String(url) }) },
    };
    if (id === "@/auth/server/config") return { publicSiteOrigin: () => "http://localhost:3000" };
    if (id === "@/auth/server/oauth") return {
      exchangeCode: async () => { exchangeCalls += 1; throw new Error("exchange failed"); },
    };
    if (id === "@/auth/server/session") return {
      clearSession: async () => { clearCalls += 1; },
      consumeOAuthFlow: async () => ({ state: "expected", verifier: "verifier", returnTo: "/account/en", locale: "en" }),
      writeSession: async () => { throw new Error("must not write a failed exchange"); },
    };
    throw new Error(`Unexpected import ${id}`);
  });

  const mismatch = await callback.GET({ nextUrl: new URL("http://localhost:3000/api/auth/callback?code=code&state=wrong") });
  assert.equal(mismatch.location, "http://localhost:3000/en?auth=oauth");
  assert.equal(exchangeCalls, 0);
  assert.equal(clearCalls, 0);

  const failedExchange = await callback.GET({ nextUrl: new URL("http://localhost:3000/api/auth/callback?code=code&state=expected") });
  assert.equal(failedExchange.location, "http://localhost:3000/en?auth=oauth");
  assert.equal(exchangeCalls, 1);
  assert.equal(clearCalls, 0);
});

test("logout rejects cross-origin POSTs before clearing the session", async () => {
  let clearCalls = 0;
  const logout = load("app/api/auth/logout/route.ts", (id) => {
    if (id === "next/server") return {
      NextResponse: {
        json: (body, init) => ({ body, status: init?.status ?? 200 }),
        redirect: (url, status) => ({ location: String(url), status }),
      },
    };
    if (id === "@/auth/server/config") return {
      authOrigin: () => "http://127.0.0.1:8000",
      publicSiteOrigin: () => "http://localhost:3000",
    };
    if (id === "@/auth/server/session") return { clearSession: async () => { clearCalls += 1; } };
    if (id === "@/auth/server/validation") return { parseLocale: (value) => value === "en" ? "en" : "vi" };
    throw new Error(`Unexpected import ${id}`);
  });

  const rejected = await logout.POST({
    headers: new Headers({ origin: "https://evil.example" }),
    nextUrl: new URL("http://localhost:3000/api/auth/logout?locale=en"),
  });
  assert.equal(rejected.status, 403);
  assert.equal(clearCalls, 0);

  const accepted = await logout.POST({
    headers: new Headers({ origin: "http://localhost:3000" }),
    nextUrl: new URL("http://localhost:3000/api/auth/logout?locale=en"),
  });
  assert.equal(accepted.status, 303);
  assert.equal(new URL(accepted.location).origin, "http://127.0.0.1:8000");
  assert.equal(clearCalls, 1);
});

test("session endpoint persists rotated tokens before returning the verified user", async () => {
  const original = { accessToken: "old", refreshToken: "old-refresh", expiresAt: 1, user: { sub: "uuid", name: "Old" } };
  const current = { accessToken: "new", refreshToken: "new-refresh", expiresAt: 2, user: { sub: "uuid", name: "Verified" } };
  let written = null;
  const sessionRoute = load("app/api/auth/session/route.ts", (id) => {
    if (id === "next/server") return {
      NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200, headers: init?.headers }) },
    };
    if (id === "@/auth/server/oauth") return {
      AuthServiceUnavailableError: class extends Error {},
      currentPublicSession: async () => current,
      sessionTokensChanged: () => true,
    };
    if (id === "@/auth/server/session") return {
      clearSession: async () => { throw new Error("must not clear a valid session"); },
      readSession: async () => original,
      writeSession: async (value) => { written = value; },
    };
    throw new Error(`Unexpected import ${id}`);
  });

  const response = await sessionRoute.GET();
  assert.equal(response.status, 200);
  assert.equal(response.body.data.user.name, "Verified");
  assert.equal(response.headers["Cache-Control"], "private, no-store");
  assert.deepEqual(JSON.parse(JSON.stringify(written)), current);
});

test("session endpoint retains rotated credentials but withholds stale user when /me is unavailable", async () => {
  const rotated = { accessToken: "new", refreshToken: "new-refresh", expiresAt: 2, user: { sub: "uuid", name: "Stale" } };
  class Unavailable extends Error {
    constructor() {
      super("offline");
      this.rotatedSession = rotated;
    }
  }
  let written = null;
  let clearCalls = 0;
  const sessionRoute = load("app/api/auth/session/route.ts", (id) => {
    if (id === "next/server") return {
      NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) },
    };
    if (id === "@/auth/server/oauth") return {
      AuthServiceUnavailableError: Unavailable,
      currentPublicSession: async () => { throw new Unavailable(); },
      sessionTokensChanged: () => false,
    };
    if (id === "@/auth/server/session") return {
      clearSession: async () => { clearCalls += 1; },
      readSession: async () => ({ accessToken: "old", refreshToken: "old-refresh", expiresAt: 1, user: rotated.user }),
      writeSession: async (value) => { written = value; },
    };
    throw new Error(`Unexpected import ${id}`);
  });

  const response = await sessionRoute.GET();
  assert.equal(response.status, 502);
  assert.deepEqual(JSON.parse(JSON.stringify(response.body)), { error: "upstream_unavailable" });
  assert.equal(response.body?.data?.user, undefined);
  assert.deepEqual(JSON.parse(JSON.stringify(written)), rotated);
  assert.equal(clearCalls, 0);
});

test("v1 auth UI always uses same-origin BFF and no session feature flag", () => {
  const siteAuth = source("src/auth/site-auth.ts");
  const provider = source("src/auth/AuthProvider.tsx");
  const logout = source("src/components/auth/LogoutButton.tsx");
  assert.doesNotMatch(siteAuth, /NEXT_PUBLIC_SITE_ORIGIN|NEXT_PUBLIC_V2_SITE_ORIGIN|externalSiteAccountHref/);
  assert.doesNotMatch(provider, /SESSION_ENABLED/);
  assert.doesNotMatch(logout, /externalSiteAccountHref|Manage sign-out|Quản lý đăng xuất/);
  assert.match(siteAuth, /return `\/api\/auth\/\$\{action\}\?\$\{query\}`/);
  assert.match(logout, /<form method="post" action=\{siteLogoutHref\(ui.locale\)\}>/);
});

test("all required auth BFF route handlers exist", () => {
  for (const route of ["login", "register", "callback", "session", "logout", "account"])
    assert.equal(existsSync(join(root, `app/api/auth/${route}/route.ts`)), true, route);
});
