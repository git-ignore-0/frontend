"use client";

import {Button,FormInput,Icon} from "@/components/UI";
import {VOUCHER_COPY} from "@/lib/voucher-copy";

type Props={id:string;locale:"vi"|"en";value:string;disabled?:boolean;loading?:boolean;applyDisabled?:boolean;error?:string;signInHref?:string;onChange:(value:string)=>void;onClear:()=>void;onApply:()=>void};

export function DiscountCodeField({id,locale,value,disabled=false,loading=false,applyDisabled=false,error,signInHref,onChange,onClear,onApply}:Props){
 const copy=VOUCHER_COPY[locale],errorId=`${id}-error`;
 return <div className="discount-code-field">
  <div className="discount-code-controls">
   <div className="discount-code-input">
    <FormInput id={id} aria-label={locale==="vi"?"Mã giảm giá":"Discount code"} autoComplete="off" maxLength={64} disabled={disabled} placeholder={locale==="vi"?"Nhập mã giảm giá":"Enter discount code"} value={value} aria-invalid={!!error} aria-describedby={error?errorId:undefined} onChange={event=>onChange(event.target.value.toUpperCase())}/>
    {value.length>0&&<button className="discount-code-clear" type="button" aria-label={copy.remove} disabled={disabled} onClick={onClear}><Icon name="close" size={16}/></button>}
   </div>
   <Button type="button" variant="outline" loading={loading} disabled={disabled||loading||applyDisabled||!value.trim()} onClick={onApply}>{copy.apply}</Button>
  </div>
  {signInHref&&<p className="sm muted"><a href={signInHref}>{copy.signIn}</a></p>}
  {error&&<p id={errorId} className="help-error" role="alert">{error}</p>}
 </div>;
}
