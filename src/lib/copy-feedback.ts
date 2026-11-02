import {copyTextToClipboard} from "@/account/referral-share";
import type {Locale} from "@/types";

export type ToastTone="success"|"error";
export async function copyWithFeedback(value:string,locale:Locale,notify:(message:string,tone?:ToastTone)=>void):Promise<boolean>{
 try{
  await copyTextToClipboard(value);
 }catch{
  notify(locale==="vi"?"Không thể sao chép. Vui lòng thử lại.":"Could not copy. Please try again.","error");
  return false;
 }
 notify(locale==="vi"?"Đã sao chép":"Copied","success");
 return true;
}
