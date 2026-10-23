import type { RewardEntry, Rewards } from "@/types";

export function applyRedemptionResult(
  rewards: Rewards | null,
  result: { balance: number; redemption: RewardEntry },
): Rewards {
  const current = rewards ?? {};
  const redemptions = current.redemptions ?? [];
  const alreadyPresent = redemptions.some((item) => item.id === result.redemption.id);
  const total = current.pagination?.redemptions?.total;
  return {
    ...current,
    balance: result.balance,
    redemptions: alreadyPresent ? redemptions : [result.redemption, ...redemptions],
    pagination: {
      ...current.pagination,
      redemptions: {
        ...current.pagination?.redemptions,
        total: typeof total === "number" && !alreadyPresent ? total + 1 : total,
      },
    },
  };
}
