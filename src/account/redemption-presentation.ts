export function redemptionStatus(status?: string): { copyKey: string; tone: string } {
  const statuses: Record<string, { copyKey: string; tone: string }> = {
    pending: { copyKey: "rewards.statusPending", tone: "pending" },
    contacted: { copyKey: "rewards.statusContacted", tone: "pending" },
    completed: { copyKey: "rewards.statusDone", tone: "done" },
    rejected: { copyKey: "rewards.statusRejected", tone: "error" },
  };
  return statuses[status || ""] || statuses.pending;
}

export function redemptionErrorCopyKey(code: string): string {
  if (code === "insufficient_points") return "rewards.errorInsufficient";
  if (code === "reward_inactive" || code === "reward_not_found") return "rewards.errorUnavailable";
  if (code === "idempotency_conflict") return "rewards.errorConflict";
  return "rewards.errorRetry";
}
