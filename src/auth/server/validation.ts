import type { Locale } from "@/types";
import { parseCoreUser, type CoreUser } from "../core-user.ts";

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function parseLocale(value: string | null, fallback: Locale = "vi"): Locale {
  return value === "vi" || value === "en" ? value : fallback;
}

export function safeReturnTo(value: string | null, fallback: string, siteOrigin: string): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) return fallback;
  try {
    const target = new URL(value, siteOrigin);
    return target.origin === siteOrigin
      ? `${target.pathname}${target.search}${target.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

export function parseTokenResponse(value: unknown): TokenResponse {
  const data = record(value);
  if (
    !data ||
    typeof data.access_token !== "string" || !data.access_token ||
    (data.refresh_token !== undefined && typeof data.refresh_token !== "string") ||
    typeof data.expires_in !== "number" || !Number.isInteger(data.expires_in) || data.expires_in <= 0 ||
    typeof data.token_type !== "string" || !data.token_type ||
    (data.scope !== undefined && typeof data.scope !== "string")
  ) throw new Error("invalid_token_response");
  return {
    access_token: data.access_token,
    ...(data.refresh_token !== undefined ? { refresh_token: data.refresh_token } : {}),
    expires_in: data.expires_in,
    token_type: data.token_type,
    ...(data.scope !== undefined ? { scope: data.scope } : {}),
  };
}

export function parseMeResponse(value: unknown): CoreUser {
  const user = parseCoreUser(record(value)?.data);
  if (!user) throw new Error("invalid_me_response");
  return user;
}
