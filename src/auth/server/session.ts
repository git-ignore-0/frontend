import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { sessionSecret } from "@/auth/server/config";
import type { CoreUser } from "@/auth/server/validation";
import type { Locale } from "@/types";

export const SESSION_COOKIE = "nfv_public_session";
export const OAUTH_FLOW_COOKIE = "nfv_public_oauth_flow";

export type PublicSession = {
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
    return JSON.parse(Buffer.concat([
      decipher.update(payload.subarray(28)),
      decipher.final(),
    ]).toString("utf8")) as T;
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
  return unseal<PublicSession>(store.get(SESSION_COOKIE)?.value);
}

export async function writeSession(session: PublicSession): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, seal(session), { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(OAUTH_FLOW_COOKIE);
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
