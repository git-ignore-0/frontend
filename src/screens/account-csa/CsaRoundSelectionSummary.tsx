"use client";

import {Button} from '@/components/UI';
import {type CsaRoundProducts} from '@/account/csa-rounds-model';
import type {Locale} from '@/types';
import {csaRoundsCopy} from '@/data/csa-rounds-copy';
import {type SelectionProduct} from './csa-rounds-presentation';
import {csaSelectionCopy} from './csa-selection-copy';
import styles from './csa-rounds.module.css';

type Props = {
  snapshot: CsaRoundProducts;
  draft: Record<string, number>;
  products: SelectionProduct[];
  locale: Locale;
  disabled: boolean;
  onRemove: (id: string) => void;
};

export function CsaRoundSelectionSummary({snapshot, draft, products, locale, disabled, onRemove}: Props) {
  const c = csaRoundsCopy(locale),copy=csaSelectionCopy(locale);
  const liveIds = new Set(snapshot.products.map(product => product.id));
  const selected = products.filter(product => (draft[product.id] ?? 0) > 0);
  return (
    <div className={styles.summaryContent} aria-label={c.summary}>
      {selected.length ? <ul>{selected.map(product => <li key={product.id}>
        <span className={styles.summaryName}>{product.name}</span>
        <strong className={styles.summaryQuantity}>× {draft[product.id]}</strong>
        {!liveIds.has(product.id) && <p className={styles.invalid}>{c.unavailableProduct}</p>}
        {!disabled && !liveIds.has(product.id) && <Button small variant="plain" onClick={() => onRemove(product.id)} aria-label={`${c.remove}: ${product.name}`}>{c.remove}</Button>}
      </li>)}</ul> : <p className="sm muted">{copy.empty}</p>}
    </div>
  );
}
