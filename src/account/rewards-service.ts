import type { Gift, Locale, Paged, RewardEntry, Rewards } from "@/types";
import { accountApi, AccountApiError } from "./account-api.ts";

export { AccountApiError } from "./account-api.ts";

type JsonRecord = Record<string, unknown>;
type PageMeta = { page: number; page_size: number; total: number };

function record(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AccountApiError("invalid_response", 502);
  }
  return value as JsonRecord;
}

function string(value: unknown): string {
  if (typeof value !== "string" || !value) throw new AccountApiError("invalid_response", 502);
  return value;
}

function integer(value: unknown, minimum = 0): number {
  if (!Number.isInteger(value) || Number(value) < minimum) {
    throw new AccountApiError("invalid_response", 502);
  }
  return Number(value);
}

function pageMeta(value: unknown): PageMeta {
  const meta = record(value);
  return {
    page: integer(meta.page, 1),
    page_size: integer(meta.page_size, 1),
    total: integer(meta.total),
  };
}

function nextCursor(meta: PageMeta): string | null {
  return meta.page * meta.page_size < meta.total ? String(meta.page + 1) : null;
}

function mapGift(value: unknown): Gift {
  const item = record(value);
  const image = item.image === null || item.image === undefined ? undefined : record(item.image);
  const imageUrl = image?.url === undefined ? undefined : string(image.url);
  return {
    id: string(item.id),
    name: string(item.name),
    ...(imageUrl ? { image: imageUrl } : {}),
    points: integer(item.point_cost),
  };
}

function mapPoint(value: unknown): RewardEntry {
  const item = record(value);
  const direction = string(item.direction);
  if (direction !== "credit" && direction !== "debit") {
    throw new AccountApiError("invalid_response", 502);
  }
  const amount = integer(item.amount, 1);
  return {
    id: string(item.id),
    date: string(item.created_at),
    description: string(item.message),
    points: direction === "credit" ? amount : -amount,
  };
}

const redemptionStatuses = new Set(["pending", "contacted", "completed", "rejected"]);

function mapRedemption(value: unknown, locale: Locale): RewardEntry {
  const item = record(value);
  const status = string(item.status);
  if (!redemptionStatuses.has(status)) throw new AccountApiError("invalid_response", 502);
  const vi = string(item.reward_name_vi_snapshot);
  const en = string(item.reward_name_en_snapshot);
  return {
    id: string(item.id),
    date: string(item.created_at),
    giftName: locale === "en" ? en : vi,
    giftNameEn: en,
    points: integer(item.point_cost_snapshot),
    status,
  };
}

function pageItems<T>(payload: JsonRecord, mapper: (value: unknown) => T): Paged<T> {
  if (!Array.isArray(payload.data)) throw new AccountApiError("invalid_response", 502);
  const meta = pageMeta(payload.meta);
  return {
    items: payload.data.map(mapper),
    nextCursor: nextCursor(meta),
    total: meta.total,
  };
}

function pageFromCursor(cursor?: string | null): number {
  return cursor && /^[1-9]\d*$/.test(cursor) ? Number(cursor) : 1;
}

export async function getRewardGiftsPage({
  locale,
  cursor,
}: {
  locale: Locale;
  cursor?: string | null;
  limit?: number;
}): Promise<Paged<Gift>> {
  const page = pageFromCursor(cursor);
  const payload = await accountApi(`rewards?locale=${locale}&page=${page}`);
  return pageItems(payload, mapGift);
}

export async function getRewardHistoryPage({
  locale,
  type,
  cursor,
}: {
  locale: Locale;
  type: "points" | "redemptions";
  cursor?: string | null;
  limit?: number;
}): Promise<Paged<RewardEntry>> {
  const page = pageFromCursor(cursor);
  const path = type === "points"
    ? `points?page=${page}`
    : `redemptions?locale=${locale}&page=${page}`;
  const payload = await accountApi(path);
  return pageItems(payload, type === "points" ? mapPoint : (item) => mapRedemption(item, locale));
}

export async function getRewards(locale: Locale): Promise<Rewards> {
  const [summaryPayload, gifts, points, redemptions] = await Promise.all([
    accountApi("account"),
    getRewardGiftsPage({ locale, cursor: "1" }),
    getRewardHistoryPage({ locale, type: "points", cursor: "1" }),
    getRewardHistoryPage({ locale, type: "redemptions", cursor: "1" }),
  ]);
  const summary = record(summaryPayload.data);
  return {
    balance: integer(summary.points_balance),
    gifts: gifts.items,
    history: points.items,
    redemptions: redemptions.items,
    pagination: {
      gifts: { nextCursor: gifts.nextCursor, total: gifts.total },
      points: { nextCursor: points.nextCursor, total: points.total },
      redemptions: { nextCursor: redemptions.nextCursor, total: redemptions.total },
    },
  };
}

export async function redeemGift({
  giftId,
  idempotencyKey,
  locale,
}: {
  giftId: string;
  idempotencyKey: string;
  locale: Locale;
}): Promise<{ accepted: true; balance: number; redemption: RewardEntry }> {
  const payload = await accountApi("redemptions", {
    method: "POST",
    body: JSON.stringify({ reward_id: giftId, idempotency_key: idempotencyKey }),
  });
  const data = record(payload.data);
  return {
    accepted: true,
    balance: integer(data.balance),
    redemption: mapRedemption(data.redemption, locale),
  };
}
