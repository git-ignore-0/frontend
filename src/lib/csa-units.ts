/** CSA quota values use numeric JSON with at most two decimal places. */
export function csaHundredths(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 ||
      !/^\d+(?:\.\d{1,2})?$/.test(String(value))) throw new Error("invalid_response");
  const hundredths = Math.round(value * 100);
  if (!Number.isSafeInteger(hundredths)) throw new Error("invalid_response");
  return hundredths;
}

export function csaUnits(value: unknown): number {
  return csaHundredths(value) / 100;
}
