"use client";

import {StoreProductRow} from '@/components/store/StorePrimitives';
import {DataState, Photo, Quantity} from '@/components/UI';
import {pointHundredths, type CsaProduct} from '@/account/csa-rounds-model';
import type {Locale} from '@/types';
import {csaRoundsCopy} from '@/data/csa-rounds-copy';
import {formatUnitSize} from '@/store/store-format';
import {pointsLabel} from './csa-rounds-presentation';
import {CsaRoundQuota} from './CsaRoundQuota';
import {csaSelectionCopy} from './csa-selection-copy';
import styles from './csa-rounds.module.css';

type Props = {
  products:CsaProduct[]; limits:Record<string,number>; draft:Record<string,number>;
  quota:{groupId:string;availableUnits:number}[]; used:Record<string,number>;
  disabled:boolean; locale:Locale; onChange:(id:string,quantity:number)=>void;
};
export function CsaRoundProductList({products,limits,draft,quota,used,disabled,locale,onChange}:Props) {
  const c=csaRoundsCopy(locale),copy=csaSelectionCopy(locale);
  if(!products.length)return <DataState kind="empty" title={c.noProducts}/>;
  const groups=new Map<string,{name:string;products:CsaProduct[]}>();
  for(const product of products){
    const group=groups.get(product.quotaGroupId)??{name:product.quotaGroupName,products:[]};
    group.products.push(product);groups.set(product.quotaGroupId,group);
  }
  const available=new Map(quota.map(row=>[row.groupId,row.availableUnits]));
  return <div className={styles.catalog}>
    {[...groups].map(([id,group])=><section className={styles.productGroup} id={`produce-${id}`} key={id} aria-label={group.name}>
      <CsaRoundQuota name={group.name} available={available.get(id)??0} used={used[id]??0} locale={locale}/>
      <div className={styles.products}>{group.products.map(product=>{
        const count=draft[product.id]??0,limit=limits[product.id]??0;
        const hint=count>product.availableQuantity?c.stock:count>limit?c.quotaChanged:product.availableQuantity===0?c.unavailableProduct:null;
        return <div key={product.id} className={styles.product}>
          <StoreProductRow name={product.name}
            image={<Photo src={product.imageUrl??undefined} alt={product.name} locale={locale}/>}
            meta={<>1 {copy.portion} · {formatUnitSize(product.unitSize)} {product.unitLabel}</>}
            amount={`${pointsLabel(pointHundredths(product.quotaCost))} ${copy.perPortion}`}
            actions={<fieldset disabled={disabled} aria-label={product.name} className={styles.productControls}>
              <Quantity count={count} min={0} max={limit} id={product.name} locale={locale}
                onMinus={()=>onChange(product.id,Math.max(0,count-1))} onPlus={()=>onChange(product.id,count+1)}/>
            </fieldset>}>
            {hint&&<p className={count>limit?styles.invalid:styles.limitHint}>{hint}</p>}
          </StoreProductRow>
        </div>;
      })}</div>
    </section>)}
  </div>;
}
