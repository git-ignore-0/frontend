"use client";
import type {ReactNode} from "react";
import {DataState} from "@/components/UI";
import {ListPaginationFooter} from "./ListPaginationFooter";
import {useNFV} from "@/state/NFVContext";

export function PagedList<T>({kind,items,render,emptyTitle,nextCursor=null,total,onMore,pending=false,failed=false,className="hist-rows",pageSize=7}:{kind:string;items:T[];render:(item:T,index:number)=>ReactNode;emptyTitle:string;nextCursor?:string|null;total?:number|null;onMore?:()=>void;pending?:boolean;failed?:boolean;className?:string;pageSize?:number}){
  const {ui,patch}=useNFV();
  const visible=Math.min(ui.visible[kind]||pageSize,items.length);
  if(!items.length)return <DataState title={emptyTitle} description={ui.locale==="en"?"Transactions will appear here when available.":"Các giao dịch sẽ xuất hiện tại đây khi có dữ liệu."}/>;
  const hasNext=visible<items.length||!!nextCursor;
  const shownTotal=total??(nextCursor?null:items.length);
  return <><div className={className}>{items.slice(0,visible).map(render)}</div><ListPaginationFooter locale={ui.locale} shown={visible} total={shownTotal} hasMore={hasNext} pageSize={visible<items.length?Math.min(pageSize,items.length-visible):pageSize} pending={pending} failed={failed} onMore={()=>{if(visible<items.length||!onMore)patch({visible:{...ui.visible,[kind]:Math.min(items.length,visible+pageSize)}});else onMore()}}/></>;
}
