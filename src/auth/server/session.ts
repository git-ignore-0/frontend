import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { sessionSecret } from "@/auth/server/config";
import type { CoreUser } from "@/auth/server/validation";
import type { Locale } from "@/types";

export const SESSION_COOKIE = "nfv_public_session";
export const SESSION_ID_COOKIE = "nfv_public_session_id";
const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const familyCookie = (id: string) => `${SESSION_COOKIE}_${id}`;
const revokedCookie = (id: string) => `${SESSION_COOKIE}_revoked_${id}`;
export const OAUTH_FLOW_COOKIE = "nfv_public_oauth_flow";

export type PublicSession = {
  sessionId?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: CoreUser;
};

export type OAuthFlow = {
  state: string;
  verifier: string;
  returnTo: string;
  locale: Locale;
  referralCode?: string;
};

function key(): Buffer {
  return crypto.createHash("sha256").update(sessionSecret()).digest();
}

export function seal(value: object): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

export function unseal<T>(value: string | undefined): T | null {
  if (!value) return null;
  try {
    const payload = Buffer.from(value, "base64url");
    if (payload.length < 29) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8"),
    ) as T;
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function readSession(): Promise<PublicSession | null> {
  const store = await cookies();
  const id = store.get(SESSION_ID_COOKIE)?.value;
  if (id !== undefined) {
    if (!sessionIdPattern.test(id) || store.get(revokedCookie(id))) return null;
    const session = unseal<PublicSession>(store.get(familyCookie(id))?.value);
    // An empty active family is a tombstone: never resurrect a late legacy cookie.
    return session?.sessionId === id ? session : null;
  }
  return store.get(revokedCookie("legacy"))
    ? null
    : unseal<PublicSession>(store.get(SESSION_COOKIE)?.value);
}

/** Only an explicit OAuth login selects the active family. */
export async function startSession(session: PublicSession): Promise<void> {
  const store = await cookies();
  const sessionId = crypto.randomUUID();
  // Bound orphan cookies left by late responses from earlier logins.
  for (const { name } of store.getAll()) {
    if (
      (name.startsWith(`${SESSION_COOKIE}_`) &&
        sessionIdPattern.test(name.slice(SESSION_COOKIE.length + 1))) ||
      (name.startsWith(`${SESSION_COOKIE}_revoked_`) &&
        sessionIdPattern.test(name.slice(`${SESSION_COOKIE}_revoked_`.length)))
    ) {
      store.delete(name);
    }
  }
  store.delete(SESSION_COOKIE);
  store.delete(revokedCookie("legacy"));
  store.set(familyCookie(sessionId), seal({ ...session, sessionId }), {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
  // The selector is not an auth credential. Keep it longer than legacy credentials
  // so a late legacy response cannot become active again after a family expires.
  store.set(SESSION_ID_COOKIE, sessionId, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Refresh responses can update their own family, never select another login. */
export async function writeSession(session: PublicSession): Promise<void> {
  const store = await cookies();
  if (session.sessionId && !sessionIdPattern.test(session.sessionId))
    throw new Error("Invalid session family");
  const name = session.sessionId ? familyCookie(session.sessionId) : SESSION_COOKIE;
  store.set(name, seal(session), {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  const id = store.get(SESSION_ID_COOKIE)?.value;
  if (id && sessionIdPattern.test(id)) store.delete(familyCookie(id));
  // A separate marker survives late refresh writes to this family's data cookie.
  store.set(revokedCookie(id && sessionIdPattern.test(id) ? id : "legacy"), "1", {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 365,
  });
  // Keep the selector tombstone and leave unrelated in-flight OAuth flows alone.
  store.delete(SESSION_COOKIE);
}

export async function writeOAuthFlow(flow: OAuthFlow): Promise<void> {
  const store = await cookies();
  store.set(OAUTH_FLOW_COOKIE, seal(flow), { ...cookieOptions, maxAge: 600 });
}

export async function consumeOAuthFlow(): Promise<OAuthFlow | null> {
  const store = await cookies();
  const flow = unseal<OAuthFlow>(store.get(OAUTH_FLOW_COOKIE)?.value);
  store.delete(OAUTH_FLOW_COOKIE);
  return flow;
}
