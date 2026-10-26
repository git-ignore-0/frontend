import {Icon,Photo} from "@/components/UI";
import {money} from "@/lib/format";
import {formatUnitSize} from "@/store/store-format";
import type {StoreLocale,StoreProductDetail} from "@/store/store-model";

const COPY={
 vi:{store:"Cửa hàng",source:"Nguồn cung",sourceEmpty:"Thông tin nông trại đang được cập nhật.",info:"Thông tin sản phẩm",csa:"Có thể dùng quyền lợi CSA",unit:"Giá theo quy cách",fallback:"Nội dung đang hiển thị bằng ngôn ngữ có sẵn."},
 en:{store:"Store",source:"Suppliers",sourceEmpty:"Farm information is being updated.",info:"Product information",csa:"CSA-eligible",unit:"Price per selling unit",fallback:"This content is shown in its available language."},
};

export function ProductDetail({product,locale}:{product:StoreProductDetail;locale:StoreLocale}){
 const copy=COPY[locale],image=product.primary_image?.variants.find(variant=>variant.width>=800)?.url??product.primary_image?.url;
 return <main className="main-content"><div className="container">
  <nav className="breadcrumbs" aria-label={copy.store}><a href={`/store/${locale}`}>{copy.store}</a><Icon name="chev" size={13}/><a href={`/store/${locale}?category_id=${product.category.id}`}>{product.category.name}</a><Icon name="chev" size={13}/><strong style={{color:"var(--ink)"}}>{product.name}</strong></nav>
  <div className="detail-layout"><div><div className="detail-photo"><Photo src={image??undefined} alt={product.name} locale={locale}/></div>{image&&<div className="detail-thumbs"><span className="detail-thumb"><Photo src={image} alt={product.name} locale={locale}/></span></div>}</div>
   <article className="detail-info">{product.csa_eligible&&<span className="status">{copy.csa}</span>}<h1>{product.name}</h1>{product.alternate_name&&<p className="muted" lang={product.content_locale==="vi"?"en":"vi"}>{product.alternate_name}</p>}
    <div className="detail-price">{money(product.retail_price_vnd)}</div><div className="detail-unit">/ {formatUnitSize(product.unit_size)} {product.unit_label} <span className="muted">· {copy.unit}</span></div>
    {product.short_description&&<p className="detail-desc">{product.short_description}</p>}
    {product.is_fallback&&<p className="store-locale-notice">{copy.fallback}</p>}
    <section className="detail-pane"><strong><Icon name="pin" size={14}/> &nbsp; {copy.source}</strong>{product.suppliers.length?<ul className="store-supplier-list">{product.suppliers.map(supplier=><li key={supplier.id}><span>{supplier.name}</span>{supplier.location&&<small>{supplier.location}</small>}</li>)}</ul>:<p>{copy.sourceEmpty}</p>}</section>
   </article>
  </div>
  {product.description&&<section className="detail-tabs"><div><h2>{copy.info}</h2><p>{product.description}</p></div></section>}
 </div></main>;
}
