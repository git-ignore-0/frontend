import type {ReactNode} from "react";
import {Icon,MoneyLine} from "@/components/UI";
import type {Locale} from "@/types";

export function StoreSection({title,children,className="",as:Tag="section"}:{title:string;children:ReactNode;className?:string;as?:"section"|"aside"}){
 return <Tag className={`store-panel ${className}`}><h2 className="store-panel-title">{title}</h2>{children}</Tag>;
}

export function StorePageHeading({title,locale,children,titleAction,parent}:{title:string;locale:Locale;children?:ReactNode;titleAction?:ReactNode;parent?:{href:string;label:string}}){
 return <><nav className="breadcrumbs" aria-label={locale==="vi"?"Cửa hàng":"Store"}><a href={parent?.href??`/store/${locale}`}>{parent?.label??(locale==="vi"?"Cửa hàng":"Store")}</a><Icon name="chev" size={13}/><span>{title}</span></nav><div className="store-page-heading">{titleAction?<div className="store-page-title"><h1>{title}</h1>{titleAction}</div>:<h1>{title}</h1>}{children}</div></>;
}

export function StoreProductRow({name,image,meta,amount,actions,children}:{name:string;image:ReactNode;meta:ReactNode;amount:string;actions?:ReactNode;children?:ReactNode}){
 return <div className="store-product-row"><span className="store-product-image">{image}</span><div className="store-product-description"><strong>{name}</strong><div className="store-product-meta">{meta}</div></div><div className="store-product-purchase"><strong className="price store-product-amount">{amount}</strong>{actions&&<div className="store-product-actions">{actions}</div>}</div>{children&&<div className="store-product-options">{children}</div>}</div>;
}

export function StoreRecipientSummary({name,phone,address,actions}:{name:string;phone:string;address:string;actions?:ReactNode}){
 return <div className="store-recipient-summary"><div className="store-recipient-contact"><strong>{name}</strong><span>{phone}</span></div><p className="store-recipient-location"><Icon name="pin" size={16}/><span>{address}</span></p>{actions&&<div className="store-address-actions">{actions}</div>}</div>;
}

export function StoreSummaryAmounts({locale,goods,shipping,benefit,total,reserveBenefit=false,discounts,voucher,cashSubtotal,children}:{locale:Locale;goods:string;shipping:string;benefit?:string;total:string;reserveBenefit?:boolean;discounts?:ReactNode;voucher?:{code:string;discount:string};cashSubtotal?:string;children?:ReactNode}){
 return <><div className="store-summary-lines"><MoneyLine label={locale==="vi"?"Tiền hàng":"Items subtotal"} value={goods}/><MoneyLine label={locale==="vi"?"Phí giao":"Delivery"} value={shipping}/>{(benefit||reserveBenefit)&&<div className="store-summary-benefit" data-active={!!benefit} aria-hidden={!benefit}><MoneyLine label={locale==="vi"?"CSA thanh toán":"Covered by CSA"} value={benefit||"—"}/></div>}{cashSubtotal!==undefined&&<MoneyLine label={locale==="vi"?"Tiền hàng cần trả":"Cash goods subtotal"} value={cashSubtotal}/>}{voucher&&<MoneyLine label={`Voucher · ${voucher.code}`} value={voucher.discount}/>}</div>{discounts}<div className="store-summary-total"><MoneyLine label={locale==="vi"?"Tổng chuyển khoản":"Transfer total"} value={total} large/></div>{children}</>;
}
