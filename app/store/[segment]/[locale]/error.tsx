"use client";

import {usePathname,useRouter,useSearchParams} from "next/navigation";
import {Button,Icon} from "@/components/UI";

export default function StoreDetailError(){
 const router=useRouter(),pathname=usePathname(),searchParams=useSearchParams();
 const locale=pathname.endsWith("/en")?"en":"vi";
 const copy=locale==="en"?{title:"We could not load this product.",body:"Please try again in a moment.",retry:"Try again",back:"Back to Store"}:{title:"Không thể tải sản phẩm này.",body:"Vui lòng thử lại sau ít phút.",retry:"Thử lại",back:"Về cửa hàng"};
 const retry=()=>{const params=new URLSearchParams(searchParams.toString()),current=Number(params.get("retry"))||0;params.set("retry",String(current>=10_000?1:current+1));router.replace(`${pathname}?${params}`)};
 return <main className="main-content"><div className="container"><div className="nfv-data-state nfv-data-state--error" role="alert"><span className="nfv-data-state-icon" aria-hidden="true"><Icon name="alert" size={23}/></span><strong className="nfv-data-state-title">{copy.title}</strong><p className="nfv-data-state-description">{copy.body}</p><div className="nfv-data-state-actions"><Button small variant="outline" onClick={retry}>{copy.retry}</Button><a className="btn btn-small btn-plain" href={`/store/${locale}`}>{copy.back}</a></div></div></div></main>;
}
