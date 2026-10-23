import type { Referrals } from "@/types";

export function mergeReferralSummary(current: Referrals | null, summary: Referrals): Referrals {
  return { ...(current ?? {}), ...summary };
}
