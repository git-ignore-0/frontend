const REFERRAL_CODE = /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{10}$/;

export function normalizeReferralCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isReferralCode(value: string): boolean {
  return REFERRAL_CODE.test(normalizeReferralCode(value));
}

export function referralErrorCopyKey(code: string): string {
  if (code === "invalid_referral_code") return "ref.invalidCode";
  if (code === "self_referral") return "ref.selfReferral";
  if (code === "referrer_already_assigned") return "ref.alreadyReferred";
  return "ref.attachErrorDesc";
}

export function referralInvitePresentation(
  invite: {name?: string; label?: string; maskedName?: string},
  formattedDate: string,
): {title: string; meta: string} {
  return {
    title: invite.name||invite.label||invite.maskedName||"—",
    meta: formattedDate,
  };
}
