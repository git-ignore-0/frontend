"use client";
/* eslint-disable @next/next/no-img-element -- v61 renders plain images with a sibling fallback; no fixed backend image sizes/domains are known. */
import {useState, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode} from "react";
import type {Locale} from "@/types";

const paths: Record<string,ReactNode> = {
 home:<><path d="m3 10 9-7 9 7v11H3V10Z"/><path d="M9 21v-7h6v7"/></>,
 external:<><path d="M13 4h7v7M20 4l-10 10"/><path d="M20 14v6H4V4h6"/></>,
 gift:<><rect x="3" y="9" width="18" height="12" rx="1"/><path d="M12 9v12M2 9h20V6H2v3Zm10-3c-2-7-9-5-5-1 1 1 5 1 5 1Zm0 0c2-7 9-5 5-1 1 1-5 1-5 1Z"/></>,
 share:<><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5m-8 8 8 4"/></>,
 leaf:<><path d="M20 4c-7 .5-13 2-15 9-1.2 4 1.2 7 5 7 7 0 10-8 10-16Z"/><path d="M4 21c3-7 7-10 13-13"/></>,
 bag:<><path d="M4 8h16l-1 13H5L4 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></>,
 search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
 user:<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3-7 8-7s8 2 8 7"/></>,
 plus:<path d="M12 5v14M5 12h14"/>,minus:<path d="M5 12h14"/>,
 arrow:<path d="m5 12 14 0m-6-6 6 6-6 6"/>,back:<path d="m19 12-14 0m6-6-6 6 6 6"/>,
 close:<path d="M5 5l14 14M19 5 5 19"/>,
 message:<><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8Z"/></>,
 quote:<><path d="M10 11H5v8h8v-8H9V9a4 4 0 0 1 4-4H9a5 5 0 0 0-5 5v1m14 0h-5v8h8v-8h-4V9a4 4 0 0 1 4-4h-4a5 5 0 0 0-5 5v1"/></>,
 filter:<path d="M4 7h16M7 12h10M10 17h4"/>,
 check:<path d="m4 12 5 5L20 6"/>,pin:<><path d="M12 22s7-6.5 7-13a7 7 0 0 0-14 0c0 6.5 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></>,
 clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
 calendar:<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
 refresh:<><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></>,
 truck:<><path d="M3 7h11v11H3V7Zm11 4h4l3 3v4h-7v-7Z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
 box:<><path d="M3 7l9-4 9 4v10l-9 4-9-4V7Z"/><path d="M3 7l9 5 9-5M12 12v9"/></>,
 file:<><path d="M6 2h8l4 4v16H6V2Z"/><path d="M14 2v4h4M9 11h6M9 15h6"/></>,
 star:<path d="m12 2 3.3 6.7 7.4 1.1-5.4 5.3 1.3 7.4-6.6-3.5-6.6 3.5 1.3-7.4-5.4-5.3 7.4-1.1L12 2Z"/>,
 "log-out":<><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="M15 16l4-4-4-4m4 4H9"/></>,
 menu:<path d="M4 6h16M4 12h16M4 18h16"/>,chev:<path d="m9 18 6-6-6-6"/>,
 heart:<path d="M20.5 8.5c0 5-8.5 11.5-8.5 11.5S3.5 13.5 3.5 8.5a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2Z"/>,
 edit:<path d="m4 20 4-.8L20 7a3 3 0 0 0-4-4L4 15l-.5 5Z"/>,
 info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/></>,
 alert:<><path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 4v.5"/></>,
 copy:<><rect x="8" y="8" width="10" height="10" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>
};
export function Icon({name,size=19}:{name:string;size?:number}) {
  return <svg className="ico" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{paths[name]||paths.leaf}</svg>;
}
/** The same V62 button treatment for real buttons and navigational links. */
function actionClasses(variant:"primary"|"outline"|"plain",small:boolean,loading:boolean,className:string){
  return `btn nfv-button ${variant==="outline"?"btn-outline":variant==="plain"?"btn-plain":""} ${small?"btn-small":""} ${loading?"is-loading":""} ${className}`.trim();
}
export function Button({variant="primary",small=false,loading=false,children,className="",...rest}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"outline"|"plain";small?:boolean;loading?:boolean}) {
  return <button type="button" {...rest} disabled={loading||rest.disabled} aria-busy={loading} className={actionClasses(variant,small,loading,className)}>
    <span className="nfv-button-content">{children}</span>{loading&&<span className="nfv-button-spinner" aria-hidden="true"/>}
  </button>;
}
export function ActionLink({variant="primary",small=false,children,className="",...rest}:AnchorHTMLAttributes<HTMLAnchorElement>&{variant?:"primary"|"outline"|"plain";small?:boolean}){
  return <a {...rest} className={actionClasses(variant,small,false,className)}><span className="nfv-button-content">{children}</span></a>;
}
export function FormInput(props:InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`nfv-control ${props.type==="search"?"nfv-control--search":""} ${props.className||""}`.trim()}/>;
}
export function FormSelect({children,...props}:React.SelectHTMLAttributes<HTMLSelectElement>){
  return <select {...props} className={`nfv-control ${props.className||""}`}>{children}</select>;
}
export function FormField({label,children,className=""}:{label:string;children:ReactNode;className?:string}){
  return <label className={className}>{label}{children}</label>;
}
export function Photo({src,alt="",className=""}:{src?:string;alt?:string;className?:string}) {
  const [broken,setBroken]=useState(false);
  const fallback=<span className="photo-fallback nfv-photo-empty"><span className="photo-placeholder-icon"><Icon name="leaf" size={20}/></span><span>Chưa có ảnh</span></span>;
  if(!src)return <span className={`nfv-photo-placeholder ${className}`} role="img" aria-label={alt||"Chưa có ảnh sản phẩm"}>{fallback}</span>;
  return <><img src={src} alt={alt} className={`${className} ${broken?"img-error":""}`} loading="lazy" onError={()=>setBroken(true)}/>{fallback}</>;
}
export function Quantity({count,onMinus,onPlus,id,min=1}:{count:number;onMinus:()=>void;onPlus:()=>void;id?:string;min?:number}){
  return <div className="qty"><button type="button" onClick={onMinus} aria-label={`Giảm số lượng ${id||""}`} disabled={count<=min}><Icon name="minus" size={16}/></button><strong>{count}</strong><button type="button" onClick={onPlus} aria-label={`Tăng số lượng ${id||""}`} disabled={count>=99}><Icon name="plus" size={16}/></button></div>;
}
export function SearchField({value,onChange,placeholder,id,small=false,maxLength}:{value:string;onChange:(value:string)=>void;placeholder:string;id:string;small?:boolean;maxLength?:number}){
  return <label className={small?"acc-order-search":"store-search"}><Icon name="search" size={small?15:19}/><FormInput id={id} type="search" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} autoComplete="off" maxLength={maxLength}/></label>;
}
export function DataState({kind="empty",title,description,icon,action,compact=false}:{kind?:"empty"|"loading"|"error"|"auth";title:string;description?:string;icon?:string;action?:{label:string;onClick:()=>void};compact?:boolean}){
  return <div className={`nfv-data-state nfv-data-state--${kind}${compact?" nfv-data-state--compact":""}`} role={kind==="error"?"alert":"status"} aria-live={kind==="error"?"assertive":"polite"} aria-busy={kind==="loading"}>
    {kind==="loading"&&<div className="nfv-data-state-skeletons" aria-hidden="true">{[0,1,2].map(i=><span className="nfv-data-state-skeleton" key={i}/>)}</div>}
    <span className="nfv-data-state-icon" aria-hidden="true"><Icon name={icon||({loading:"clock",error:"alert",auth:"user",empty:"bag"}[kind])} size={23}/></span>
    <strong className="nfv-data-state-title">{title}</strong>{description&&<p className="nfv-data-state-description">{description}</p>}
    {action&&<div className="nfv-data-state-actions"><Button small variant="outline" onClick={action.onClick}>{action.label}</Button></div>}
  </div>;
}
export function Section({title,description,actions,children,className=""}:{title:string;description?:string;actions?:ReactNode;children:ReactNode;className?:string}){
  return <section className={`acc-section ${className}`}><div className="acc-heading"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{actions&&<div className="acc-heading-actions">{actions}</div>}</div>{children}</section>;
}
const toneMap:Record<string,string>={processing:"p2",pending:"p2",confirmed:"",completed:"",delivered:"",recorded:"",cancelled:"neutral",rejected:"neutral",invalid:"neutral",active:"",neutral:"neutral",done:""};
const statusLabels:Record<string,string>={processing:"Đang xử lý",pending:"Đang chờ",confirmed:"Đã xác nhận",completed:"Hoàn thành",delivered:"Đã giao",cancelled:"Đã hủy",rejected:"Không được chấp nhận",invalid:"Không hợp lệ",recorded:"Đã ghi nhận"};
export function Status({status,label}:{status:string;label?:string}){return <span className={`status ${toneMap[status]||"neutral"}`}>{label||statusLabels[status]||status}</span>;}
export function MoneyLine({label,value,large=false}:{label:string;value:string;large?:boolean}){return <div className={`money-line ${large?"big":""}`}><span>{label}</span><strong>{value}</strong></div>;}
export function Tabs({items,value,onChange,label="Chọn một mục",disabled=false}:{items:{value:string;label:string;count?:number}[];value:string;onChange:(value:string)=>void;label?:string;disabled?:boolean}){
  return <div className="selection-chips" role="group" aria-label={label}>{items.map(item=><button key={item.value} type="button" disabled={disabled} className={`selection-chip ${value===item.value?"active":""}`} aria-pressed={value===item.value} onClick={()=>onChange(item.value)}>
    <span className="selection-chip-text">{item.label}</span>{Number.isFinite(item.count)&&<span className="selection-chip-count" aria-hidden="true">{item.count}</span>}</button>)}</div>;
}
export function localized(record:Record<string,unknown>|null|undefined,key:string,locale:Locale){
  if(!record)return "";
  const en=record[`${key}En`]??record[`${key}_en`];
  return String((locale==="en"&&en)||record[key]||en||"");
}
