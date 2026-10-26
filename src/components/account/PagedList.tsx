"use client";
import type {ReactNode} from "react";
import {Button,DataState} from "@/components/UI";
import {useNFV} from "@/state/NFVContext";

export function PagedList<T>({kind,items,render,emptyTitle,nextCursor=null,total,onMore,pending=false,failed=false,className="hist-rows",pageSize=7}:{kind:string;items:T[];render:(item:T,index:number)=>ReactNode;emptyTitle:string;nextCursor?:string|null;total?:number|null;onMore?:()=>void;pending?:boolean;failed?:boolean;className?:string;pageSize?:number}){
  const {ui,patch}=useNFV();
  const visible=Math.min(ui.visible[kind]||pageSize,items.length);
  if(!items.length)return <DataState title={emptyTitle} description={ui.locale==="en"?"Transactions will appear here when available.":"Các giao dịch sẽ xuất hiện tại đây khi có dữ liệu."}/>;
  const hasNext=visible<items.length||!!nextCursor;
  const shownTotal=total??(nextCursor?null:items.length);
  return <><div className={className}>{items.slice(0,visible).map(render)}</div><div className="hist-footer" aria-live="polite">
    <span>{ui.locale==="en"?"Showing":"Đang hiển thị"} <strong>{visible}</strong>{shownTotal!=null&&<> / <strong>{shownTotal}</strong></>} {ui.locale==="en"?"items":"mục"}</span>
    {hasNext&&<Button small variant="outline" loading={pending} onClick={onMore||(()=>patch({visible:{...ui.visible,[kind]:visible+pageSize}}))}>{failed?(ui.locale==="en"?"Try again":"Thử lại"):(ui.locale==="en"?`Load more ${Math.min(pageSize,Math.max(0,(shownTotal??visible+pageSize)-visible))} items`:`Xem thêm ${Math.min(pageSize,Math.max(0,(shownTotal??visible+pageSize)-visible))} mục`)}</Button>}
    {failed&&<span className="hist-page-error" role="alert">{ui.locale==="en"?"Could not load more history. Try again.":"Không tải được thêm lịch sử. Hãy thử lại."}</span>}
  </div></>;
}
