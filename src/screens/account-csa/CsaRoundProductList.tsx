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
    {[...groups].map(([id,group])=>{
      const allowance=available.get(id)??0;
      const groupUsed=used[id]??0;
      const remaining=pointHundredths(allowance)-groupUsed;
      const groupId=`produce-${id}`;
      const holdHelpId=`${groupId}-hold`;
      const quotaHelpId=`${groupId}-quota`;
      const rows=group.products.map(product=>{
        const count=draft[product.id]??0;
        const limit=limits[product.id]??0;
        const cap=product.availableQuantity;
        const cost=pointHundredths(product.quotaCost);
        const overStock=count>cap;
        const overQuota=!overStock && count>limit;
        const quotaBlocked=overQuota || !overStock && count<cap && count>=limit && remaining<cost;
        const hint=overStock
          ? product.heldOnly ? copy.heldLimit.replace('{max}',String(cap)) : c.stock
          : !cap ? copy.noStock : product.heldOnly ? copy.heldOnly.replace('{max}',String(cap)) : null;
        return {product,count,limit,cost,overStock,overQuota,quotaBlocked,hint};
      });
      const overQuota=rows.some(row=>row.overQuota);
      const quotaBlocked=rows.some(row=>row.quotaBlocked);
      const hasHeld=rows.some(({product})=>product.heldOnly);
      return <section className={`store-panel ${styles.productGroup}`} id={groupId} key={id} aria-label={group.name}>
        <CsaRoundQuota name={group.name} available={allowance} used={groupUsed} locale={locale}/>
        {(hasHeld || quotaBlocked) && <div className={styles.groupNotices}>
          {hasHeld && <p id={holdHelpId}>{copy.heldUndo}</p>}
          {quotaBlocked && <p id={quotaHelpId} className={overQuota ? styles.invalid : undefined}>
            {overQuota ? c.quotaChanged : copy.noQuota}
          </p>}
        </div>}
        {rows.map(({product,count,limit,cost,overStock,quotaBlocked,hint})=>{
          const hintId=`${groupId}-${product.id}-hint`;
          const describedBy=[product.heldOnly && holdHelpId, quotaBlocked && quotaHelpId, hint && hintId]
            .filter(Boolean).join(' ') || undefined;
          return <StoreProductRow key={product.id} name={product.name}
            image={<Photo src={product.imageUrl??undefined} alt={product.name} locale={locale}/>}
            meta={<>1 {copy.portion} · {formatUnitSize(product.unitSize)} {product.unitLabel}</>}
            amount={`${pointsLabel(cost)} ${copy.perPortion}`}
            actions={<fieldset disabled={disabled} aria-label={product.name} aria-describedby={describedBy} className={styles.productControls}>
              <Quantity count={count} min={0} max={limit} id={product.name} locale={locale}
                onMinus={()=>onChange(product.id,Math.max(0,count-1))} onPlus={()=>onChange(product.id,count+1)}/>
            </fieldset>}>
            {hint && <p id={hintId} className={`${styles.limitHint}${overStock ? ` ${styles.invalid}` : ''}`}>{hint}</p>}
          </StoreProductRow>;
        })}
      </section>;
    })}
  </div>;
}
