import {pointHundredths} from '@/account/csa-rounds-model';
import type {Locale} from '@/types';
import {pointsLabel} from './csa-rounds-presentation';
import {csaSelectionCopy} from './csa-selection-copy';
import styles from './csa-rounds.module.css';

export function CsaRoundQuota({name, available, used, locale}: {name: string; available: number; used: number; locale: Locale}) {
  const c = csaSelectionCopy(locale);
  const total = pointHundredths(available);
  const remaining = total - used;
  return <header className={styles.groupQuota}>
    <div className={styles.groupQuotaHeading}>
      <h2>{name}</h2>
      <strong className={remaining < 0 ? styles.invalid : undefined}>{pointsLabel(remaining)} <small>{c.remaining}</small></strong>
    </div>
  </header>;
}
