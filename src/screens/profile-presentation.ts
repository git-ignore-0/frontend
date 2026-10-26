import type {Locale} from "@/types";
import {formatDate} from "@/lib/date-format";

export function profileBirthDate(value:string|null,locale:Locale):string {
  void locale;
  if(!value)return "";
  return formatDate(value);
}
