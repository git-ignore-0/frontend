import {Button} from "@/components/UI";
import type {Locale} from "@/types";

export function ListPaginationFooter({locale,shown,total,hasMore,pageSize=7,pending=false,failed=false,onMore}:{locale:Locale;shown:number;total?:number|null;hasMore:boolean;pageSize?:number;pending?:boolean;failed?:boolean;onMore:()=>void}){
 const count=Math.min(pageSize,Math.max(0,(total??shown+pageSize)-shown));
 return <div className="hist-footer" aria-live="polite"><span>{locale==="en"?"Showing":"Đang hiển thị"} <strong>{shown}</strong>{total!=null&&<> / <strong>{total}</strong></>} {locale==="en"?"items":"mục"}</span>{hasMore&&<Button small variant="outline" loading={pending} disabled={pending} onClick={onMore}>{failed?(locale==="en"?"Try again":"Thử lại"):(locale==="en"?`Load more ${count} items`:`Xem thêm ${count} mục`)}</Button>}{failed&&<span className="hist-page-error" role="alert">{locale==="en"?"Could not load more items. Try again.":"Không tải được thêm dữ liệu. Hãy thử lại."}</span>}</div>;
}
