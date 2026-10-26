import {formatDate} from "./date-format";

export const money = (value: number) => Math.max(0, Math.round(value)).toLocaleString("vi-VN") + "đ";
export const digits = (value: string) => value.replace(/\D/g, "").slice(0, 10);
export const validPhone = (phone: string) => /^(0[35789])\d{8}$/.test(digits(phone));
export const formatAddress = (a: {detail?: string; ward?: string; city?: string}) =>
  [a.detail, a.ward, a.city].map(x => String(x ?? "").trim()).filter(Boolean).join(", ");
export function dateLabel(date?: string | number | null): string {
  return formatDate(date);
}
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
