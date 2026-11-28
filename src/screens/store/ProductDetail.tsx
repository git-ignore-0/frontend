"use client";

import {StoreProductDescription} from "@/components/store/StoreProductDescription";
import {useEffect,useRef,useState} from "react";
import {Button,Icon,Photo,Quantity} from "@/components/UI";
import {STORE_COPY} from "@/data/store-copy";
import {money} from "@/lib/format";
import {formatCsaQuotaBadge,formatUnitSize} from "@/store/store-format";
import type {StoreLocale,StoreProductDetail} from "@/store/store-model";
import {useNFV} from "@/state/NFVContext";
import {storePurchaseLimit} from "@/store/store-limits";

const COPY={
 vi:{store:"Cửa hàng",info:"Thông tin sản phẩm",addCart:"Thêm vào giỏ hàng",fallback:"Nội dung đang hiển thị bằng ngôn ngữ có sẵn.",out:"Hết hàng",available:"Còn {count} phần"},
 en:{store:"Store",info:"Product information",addCart:"Add to cart",fallback:"This content is shown in its available language.",out:"Out of stock",available:"{count} available"},
};

export function ProductDetail({product,locale}:{product:StoreProductDetail;locale:StoreLocale}){
 const copy=COPY[locale],image=product.primary_image?.variants.find(variant=>variant.width>=800)?.url??product.primary_image?.url;
 const {addCart,cartHydrated,storeAvailability,recheckStoreProducts}=useNFV();
 const publishedProduct=useRef<StoreProductDetail|null>(null);
 useEffect(()=>{
  if(!cartHydrated||publishedProduct.current===product)return;
  publishedProduct.current=product;
  recheckStoreProducts([product]);
 },[cartHydrated,product,recheckStoreProducts]);
 const verifiedStock=storeAvailability[product.id];
 const stock=verifiedStock===null?0:verifiedStock??product.available_quantity;
 const max=storePurchaseLimit(stock);
 const [quantity,setQuantity]=useState(1);
 const exceedsStock=quantity>max;
 const availabilityId=`product-availability-${product.id}`;
 const stockMessage=verifiedStock===null?STORE_COPY[locale].unavailable:stock===0?copy.out:copy.available.replace("{count}",String(stock));
 return <main className="main-content"><div className="container">
  <nav className="breadcrumbs" aria-label={copy.store}><a href={`/store/${locale}`}>{copy.store}</a><Icon name="chev" size={13}/><a href={`/store/${locale}?category_id=${product.category.id}`}>{product.category.name}</a><Icon name="chev" size={13}/><strong style={{color:"var(--ink)"}}>{product.name}</strong></nav>
  <div className="detail-layout"><div><div className="detail-photo"><Photo src={image??undefined} alt={product.name} locale={locale}/></div>{image&&<div className="detail-thumbs"><span className="detail-thumb"><Photo src={image} alt={product.name} locale={locale}/></span></div>}</div>
   <article className="detail-info">{product.csa_quota_group&&<span className="status">{formatCsaQuotaBadge(product.csa_quota_group,locale)}</span>}<h1>{product.name}</h1>
    <div className="detail-price-line"><div className="detail-price">{money(product.retail_price_vnd)}</div><div className="detail-unit">/ {formatUnitSize(product.unit_size)} {product.unit_label}</div></div>
    {product.short_description&&<p className="detail-desc">{product.short_description}</p>}
    {product.is_fallback&&<p className="store-locale-notice">{copy.fallback}</p>}
    <p id={availabilityId} className={exceedsStock&&max>0?"help-error":"sm muted"} role="status">{exceedsStock&&max>0?STORE_COPY[locale].reduceQuantity.replace("{count}",String(max)):stockMessage}</p>
    <div className="detail-select"><div className="buy-row"><Quantity count={quantity} max={max} disabled={max===0&&quantity===1} onMinus={()=>setQuantity(current=>Math.max(1,current-1))} onPlus={()=>setQuantity(current=>current<max?current+1:current)} id={product.name} describedBy={availabilityId} locale={locale}/><Button disabled={exceedsStock} aria-describedby={availabilityId} onClick={()=>addCart(product,quantity)}><Icon name="bag" size={17}/> {max>0?copy.addCart:stockMessage}</Button></div></div>
   </article>
  </div>
  <StoreProductDescription description={product.description} document={product.description_document} heading={copy.info}/>
 </div></main>;
}
