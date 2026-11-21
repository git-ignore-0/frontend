import type { Locale } from "@/types";

export type CoreUser = {
  sub: string;
  name: string;
  email: string | null;
  email_verified: boolean;
  login_phone_number: string | null;
  locale: Locale;
  status: "active";
  roles: string[];
  phone_number: string;
  date_of_birth: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_PHONE = /^\+84(?:[35789][0-9]{8}|2[0-9]{9})$/;
const PROFILE_PHONE = /^[0-9+().\-\s]*$/;
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

/** Validate the same profile contract at the Core and browser session boundaries. */
export function parseCoreUser(value: unknown): CoreUser | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (
    typeof data.sub !== "string" || !UUID.test(data.sub) ||
    typeof data.name !== "string" ||
    (data.email !== null && (typeof data.email !== "string" || !EMAIL.test(data.email))) ||
    typeof data.email_verified !== "boolean" || (data.email === null && data.email_verified) ||
    (data.login_phone_number !== null &&
      (typeof data.login_phone_number !== "string" || !LOGIN_PHONE.test(data.login_phone_number))) ||
    (data.locale !== "vi" && data.locale !== "en") ||
    data.status !== "active" ||
    !Array.isArray(data.roles) || data.roles.some(role => typeof role !== "string") ||
    typeof data.phone_number !== "string" ||
    data.phone_number.length > 32 || !PROFILE_PHONE.test(data.phone_number) ||
    !validIsoDate(data.date_of_birth)
  ) return null;
  return {
    sub: data.sub,
    name: data.name,
    email: data.email,
    email_verified: data.email_verified,
    login_phone_number: data.login_phone_number,
    locale: data.locale,
    status: data.status,
    roles: data.roles as string[],
    phone_number: data.phone_number,
    date_of_birth: data.date_of_birth,
  };
}
