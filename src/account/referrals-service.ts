import type { Invitee, Paged, Referrals } from "@/types";
import { accountApi, AccountApiError } from "./account-api.ts";
import { isReferralCode, normalizeReferralCode } from "./referral-presentation.ts";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AccountApiError("invalid_response", 502);
  }
  return value as JsonRecord;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || !value) throw new AccountApiError("invalid_response", 502);
  return value;
}

function integer(value: unknown, minimum = 0): number {
  if (!Number.isInteger(value) || Number(value) < minimum) {
    throw new AccountApiError("invalid_response", 502);
  }
  return Number(value);
}

function pageFromCursor(cursor?: string | null): number {
  return cursor && /^[1-9]\d*$/.test(cursor) ? Number(cursor) : 1;
}

function mapSummary(payload: JsonRecord): Referrals {
  const data = record(payload.data);
  const code = requiredString(data.referral_code);
  if (!isReferralCode(code) || typeof data.can_submit_referral_code !== "boolean") {
    throw new AccountApiError("invalid_response", 502);
  }
  const rawReferrer = data.referrer;
  const referrer = rawReferrer === null
    ? null
    : (() => {
        const item = record(rawReferrer);
        return { id: requiredString(item.id), name: requiredString(item.name) };
      })();
  return {
    code,
    referrer,
    canEnterReferrer: data.can_submit_referral_code,
    invitedCount: integer(data.invited_count),
  };
}

function mapInvitee(value: unknown): Invitee {
  const item = record(value);
  if (item.status !== "joined") throw new AccountApiError("invalid_response", 502);
  return {
    id: requiredString(item.id),
    name: requiredString(item.name),
    status: "recorded",
    date: requiredString(item.referred_at),
  };
}

export async function getReferralsPage({
  cursor,
}: {
  cursor?: string | null;
  limit?: number;
}): Promise<Paged<Invitee>> {
  const page = pageFromCursor(cursor);
  const payload = await accountApi(`invited-users?page=${page}`);
  if (!Array.isArray(payload.data)) throw new AccountApiError("invalid_response", 502);
  const meta = record(payload.meta);
  const currentPage = integer(meta.page, 1);
  const pageSize = integer(meta.page_size, 1);
  const total = integer(meta.total);
  return {
    items: payload.data.map(mapInvitee),
    nextCursor: currentPage * pageSize < total ? String(currentPage + 1) : null,
    total,
  };
}

export async function getReferrals(): Promise<Referrals> {
  const [summaryPayload, invited] = await Promise.all([
    accountApi("account"),
    getReferralsPage({ cursor: "1" }),
  ]);
  const summary = mapSummary(summaryPayload);
  return {
    ...summary,
    invitees: invited.items,
    pagination: {
      invitees: { nextCursor: invited.nextCursor, total: invited.total },
    },
  };
}

export async function applyReferralCode({ code }: { code: string }): Promise<Referrals> {
  const normalized = normalizeReferralCode(code);
  if (!isReferralCode(normalized)) throw new AccountApiError("invalid_referral_code", 400);
  const payload = await accountApi("submit-code", {
    method: "POST",
    body: JSON.stringify({ code: normalized }),
  });
  return mapSummary(payload);
}
