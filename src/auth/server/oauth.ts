import "server-only";

import crypto from "node:crypto";
import {
  authOrigin,
  oauthClientId,
  oauthClientSecret,
  publicSiteOrigin,
} from "@/auth/server/config";
import type { PublicSession } from "@/auth/server/session";
import { parseMeResponse, parseTokenResponse } from "@/auth/server/validation";

export const PUBLIC_SCOPES = "profile email";
const AUTH_TIMEOUT_MS = 10_000;
const refreshes = new Map<string, Promise<PublicSession>>();

export class PublicSessionInvalidError extends Error {}
export class AuthServiceUnavailableError extends Error {
  readonly rotatedSession?: PublicSession;

  constructor(
    message: string,
    options?: ErrorOptions & { rotatedSession?: PublicSession },
  ) {
    super(message, options);
    this.rotatedSession = options?.rotatedSession;
  }
}

async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
  } catch (error) {
    throw new AuthServiceUnavailableError("Core Auth is unavailable", { cause: error });
  }
}

export function randomUrlSafe(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

async function tokenRequest(parameters: URLSearchParams) {
  parameters.set("client_id", oauthClientId());
  parameters.set("client_secret", oauthClientSecret());
  const response = await authFetch(`${authOrigin()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parameters,
    cache: "no-store",
  });
  if (!response.ok) {
    const ErrorType = response.status === 400 || response.status === 401
      ? PublicSessionInvalidError
      : AuthServiceUnavailableError;
    throw new ErrorType(`OAuth token request failed (${response.status})`);
  }
  try {
    return parseTokenResponse(await response.json());
  } catch (error) {
    throw new AuthServiceUnavailableError("Core Auth returned an invalid token response", { cause: error });
  }
}

async function fetchCoreUser(accessToken: string) {
  const response = await authFetch(`${authOrigin()}/api/v1/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new PublicSessionInvalidError(`Core profile request failed (${response.status})`);
    }
    throw new AuthServiceUnavailableError(`Core profile request failed (${response.status})`);
  }
  try {
    return parseMeResponse(await response.json());
  } catch (error) {
    throw new AuthServiceUnavailableError("Core Auth returned an invalid profile response", { cause: error });
  }
}

export async function exchangeCode(code: string, verifier: string): Promise<PublicSession> {
  const token = await tokenRequest(new URLSearchParams({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: `${publicSiteOrigin()}/api/auth/callback`,
  }));
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? "",
    expiresAt: Date.now() + token.expires_in * 1000,
    user: await fetchCoreUser(token.access_token),
  };
}

export async function refreshPublicSession(session: PublicSession): Promise<PublicSession> {
  if (!session.refreshToken) throw new PublicSessionInvalidError("Session cannot be refreshed");
  const token = await tokenRequest(new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: session.refreshToken,
    scope: PUBLIC_SCOPES,
  }));
  const rotatedSession: PublicSession = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + token.expires_in * 1000,
    user: session.user,
  };
  try {
    return { ...rotatedSession, user: await fetchCoreUser(token.access_token) };
  } catch (error) {
    if (error instanceof AuthServiceUnavailableError) {
      throw new AuthServiceUnavailableError(error.message, {
        cause: error,
        rotatedSession,
      });
    }
    throw error;
  }
}

export function sessionTokensChanged(previous: PublicSession, current: PublicSession): boolean {
  return previous.accessToken !== current.accessToken ||
    previous.refreshToken !== current.refreshToken ||
    previous.expiresAt !== current.expiresAt;
}

export async function currentPublicSession(session: PublicSession): Promise<PublicSession> {
  if (session.expiresAt < Date.now() + 30_000) {
    const fingerprint = crypto.createHash("sha256").update(session.refreshToken).digest("base64url");
    const active = refreshes.get(fingerprint);
    if (active) return active;
    const refresh = refreshPublicSession(session).finally(() => {
      if (refreshes.get(fingerprint) === refresh) refreshes.delete(fingerprint);
    });
    refreshes.set(fingerprint, refresh);
    return refresh;
  }
  return { ...session, user: await fetchCoreUser(session.accessToken) };
}
