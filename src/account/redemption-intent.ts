export type RedemptionIntent = {
  giftId: string;
  idempotencyKey: string;
  phase: "confirm" | "success" | "error";
};

export function beginRedemptionIntent(
  giftId: string,
  createKey: () => string = () => crypto.randomUUID(),
): RedemptionIntent {
  return { giftId, idempotencyKey: createKey(), phase: "confirm" };
}

export function redemptionRequest(intent: RedemptionIntent) {
  return { giftId: intent.giftId, idempotencyKey: intent.idempotencyKey };
}
