"use client";
import {useEffect,useState} from "react";
import {Button,DataState,Icon} from "@/components/UI";
import type {CsaCopy} from "@/data/csa-content";
import type {Locale} from "@/types";
import {csaMoney,csaQuantity,csaSavings,type CsaPackage} from "./csa-packages-model";
import {useCsaPackages} from "./useCsaPackages";
import {CsaSectionHeading} from "./CsaSectionHeading";

function PackageCard({item,copy,locale}:{item:CsaPackage;copy:CsaCopy;locale:Locale}){
  const oneMonth=item.price_options.find(option=>option.duration_months===1);
  const savings=item.price_options.map(option=>csaSavings(option,oneMonth));
  const topSaving=savings.reduce((a,b)=>a>b?a:b,BigInt(0));
  const bestIndex=topSaving>BigInt(0)?savings.findIndex(s=>s===topSaving):-1;
  return <article className="csa-v2-package-card">
    <div className="csa-v2-package-summary"><h3>{item.name}</h3>{item.description&&<p>{item.description}</p>}</div>
    <div className="csa-v2-package-allocation"><h4>{copy.includedProducts}</h4><ul>{item.items.map(product=><li key={product.product_id}><span>{product.product_name}</span><b>{csaQuantity(product.unit_size,product.quota_units,locale)} {locale==="vi"?product.unit_label_vi:product.unit_label_en} / {copy.cycle}</b></li>)}</ul><div className="csa-v2-package-policy"><Icon name="info" size={14}/><p>{copy.quota[item.quota_policy]}</p></div></div>
    <div className="csa-v2-package-prices"><h4>{copy.priceOptions}</h4><ul>{item.price_options.map((option,index)=><li key={option.id}><div className="csa-v2-price-head"><strong>{copy.month.replace("{count}",String(option.duration_months))}</strong>{index===bestIndex&&<span className="csa-v2-best-saving">{copy.bestSavings}</span>}</div><dl><div><dt>{copy.monthlyPrice}</dt><dd>{csaMoney(option.monthly_price_vnd,locale)}</dd></div><div><dt>{copy.totalPrice}</dt><dd>{csaMoney(option.total_price_vnd,locale)}</dd></div></dl>{savings[index]>BigInt(0)&&<p className="csa-v2-saving">{copy.saving.replace("{amount}",csaMoney(savings[index].toString(),locale))}</p>}</li>)}</ul></div>
  </article>;
}
export function CsaPackages({copy,locale}:{copy:CsaCopy;locale:Locale}){
  const [page,setPage]=useState(1);
  useEffect(()=>setPage(1),[locale]);
  const result=useCsaPackages(locale,page);
  const data=result.page;
  const count=data?.data.length??0;
  const pages=data?.meta?Math.max(1,Math.ceil(data.meta.total/data.meta.page_size)):1;
  return <section className="csa-v2-packages" aria-labelledby="csa-packages-title"><CsaSectionHeading id="csa-packages-title" title={copy.packagesTitle} intro={copy.packagesSubtitle}/>
    {result.status==="loading"?<DataState compact kind="loading" title={copy.packagesLoading}/>:
      result.status==="error"?<DataState compact kind="error" title={copy.packagesError} action={{label:copy.retry,onClick:result.retry}}/>:
      !count?<DataState compact title={copy.packagesEmpty}/>:
      <><div className={`csa-v2-package-list ${count===1?"is-single":count===2?"is-pair":count>3?"is-scrollable":""}`}>{data?.data.map(item=><PackageCard key={item.id} item={item} copy={copy} locale={locale}/>)}</div>
      {data&&pages>1&&<nav className="csa-v2-pagination" aria-label={locale==="vi"?"Phân trang gói CSA":"CSA package pages"}><Button variant="outline" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>{copy.previousPage}</Button><span>{copy.pageSummary.replace("{page}",String(data.meta?.page??page)).replace("{pages}",String(pages))}</span><Button variant="outline" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>{copy.nextPage}</Button></nav>}</>}
  </section>;
}
