"use client";

import {useState} from "react";
import {Button,Icon,Photo,Quantity} from "@/components/UI";
import {money} from "@/lib/format";
import {formatCsaQuotaBadge,formatUnitSize} from "@/store/store-format";
import type {StoreLocale,StoreProductDetail} from "@/store/store-model";

const COPY={
 vi:{store:"Cửa hàng",info:"Thông tin sản phẩm",addCart:"Thêm vào giỏ hàng",fallback:"Nội dung đang hiển thị bằng ngôn ngữ có sẵn."},
 en:{store:"Store",info:"Product information",addCart:"Add to cart",fallback:"This content is shown in its available language."},
};

export function ProductDetail({product,locale}:{product:StoreProductDetail;locale:StoreLocale}){
 const copy=COPY[locale],image=product.primary_image?.variants.find(variant=>variant.width>=800)?.url??product.primary_image?.url;
 const [quantity,setQuantity]=useState(1);
 return <main className="main-content"><div className="container">
  <nav className="breadcrumbs" aria-label={copy.store}><a href={`/store/${locale}`}>{copy.store}</a><Icon name="chev" size={13}/><a href={`/store/${locale}?category_id=${product.category.id}`}>{product.category.name}</a><Icon name="chev" size={13}/><strong style={{color:"var(--ink)"}}>{product.name}</strong></nav>
  <div className="detail-layout"><div><div className="detail-photo"><Photo src={image??undefined} alt={product.name} locale={locale}/></div>{image&&<div className="detail-thumbs"><span className="detail-thumb"><Photo src={image} alt={product.name} locale={locale}/></span></div>}</div>
   <article className="detail-info">{product.csa_quota_group&&<span className="status">{formatCsaQuotaBadge(product.csa_quota_group,locale)}</span>}<h1>{product.name}</h1>
    <div className="detail-price-line"><div className="detail-price">{money(product.retail_price_vnd)}</div><div className="detail-unit">/ {formatUnitSize(product.unit_size)} {product.unit_label}</div></div>
    {product.short_description&&<p className="detail-desc">{product.short_description}</p>}
    {product.is_fallback&&<p className="store-locale-notice">{copy.fallback}</p>}
    <div className="detail-select"><div className="buy-row"><Quantity count={quantity} onMinus={()=>setQuantity(value=>Math.max(1,value-1))} onPlus={()=>setQuantity(value=>Math.min(99,value+1))} id={product.name} locale={locale}/><Button><Icon name="bag" size={17}/> {copy.addCart}</Button></div></div>
   </article>
  </div>
  {product.description&&<section className="detail-tabs"><div><h2>{copy.info}</h2><p>{product.description}</p></div></section>}
 </div></main>;
}
