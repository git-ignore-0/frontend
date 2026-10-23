import type { Locale } from "@/types";

export type CoreUser = {
  sub: string;
  name: string;
  email: string;
  email_verified: true;
  locale: Locale;
  status: "active";
  roles: string[];
  phone_number: string;
  date_of_birth: string | null;
};

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+().\-\s]*$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function validIsoDate(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

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
  const envelope = record(value);
  const data = record(envelope?.data);
  if (
    !data ||
    typeof data.sub !== "string" || !UUID.test(data.sub) ||
    typeof data.name !== "string" ||
    typeof data.email !== "string" || !EMAIL.test(data.email) ||
    data.email_verified !== true ||
    (data.locale !== "vi" && data.locale !== "en") ||
    data.status !== "active" ||
    !Array.isArray(data.roles) || data.roles.some(role => typeof role !== "string") ||
    typeof data.phone_number !== "string" || data.phone_number.length > 32 || !PHONE.test(data.phone_number) ||
    !validIsoDate(data.date_of_birth)
  ) throw new Error("invalid_me_response");
  return {
    sub: data.sub,
    name: data.name,
    email: data.email,
    email_verified: true,
    locale: data.locale,
    status: "active",
    roles: data.roles as string[],
    phone_number: data.phone_number,
    date_of_birth: data.date_of_birth,
  };
}
