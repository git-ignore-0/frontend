"use client";

import {useEffect, useRef} from 'react';
import {ActionLink, Button, Status} from '@/components/UI';
import {csaRoundsCopy, csaRoundError} from '@/data/csa-rounds-copy';
import {formatDateTime} from '@/lib/date-format';
import {csaRoundHref} from '@/lib/csa-navigation';
import {selectionAccess, type CsaRound, type CsaSelection} from '@/account/csa-rounds-model';
import type {Locale} from '@/types';
import {useCsaServerClock} from './useCsaServerClock';
import styles from './csa-rounds.module.css';

type Props = {
  round: CsaRound;
  selection: CsaSelection | null | undefined;
  error?: unknown;
  loading: boolean;
  eligible: boolean;
  receivedAt?: number;
  locale: Locale;
  onRetry: () => void;
  active?: boolean;
};

export function CsaRoundItem({round, selection, error, loading, eligible, receivedAt, locale, onRetry, active=true}: Props) {
  const c = csaRoundsCopy(locale);
  const now = useCsaServerClock(selection?.serverTime ?? round.serverTime, receivedAt, active);
  const access = selectionAccess({round, selection: selection ?? null, eligible, serverNow: now});
  const terminal = selection?.state === 'delivered' ? 'delivered'
    : round.status === 'cancelled' || selection?.state === 'cancelled' ? 'cancelled' : null;
  let state: keyof typeof c.states;
  if (terminal) state = terminal;
  else if (selection === undefined) state = 'unknown';
  else if (selection?.state === 'reselecting') state = access.mode === 'reselect' ? 'reselecting' : 'closed';
  else if (selection?.state === 'locked' || selection?.state === 'confirmed') state = selection.state;
  else if (now < Date.parse(round.opensAt)) state = 'scheduled';
  else state = selection?.lines.length ? selection.state : 'unselected';

  const cutoff = selection?.state === 'reselecting' ? selection.reopenUntil
    : !selection || selection.state === 'selecting' ? round.closesAt : null;
  const refreshed = useRef('');
  useEffect(() => {
    if (!active || !cutoff || round.status === 'cancelled' || now < Date.parse(cutoff)) return;
    const token = `${round.id}:${cutoff}`;
    if (refreshed.current === token) return;
    refreshed.current = token;
    onRetry();
  }, [active, cutoff, round.id, round.status, now, onRetry]);

  const lines = selection?.lines ?? [];
  const label = access.mode === 'select' ? c.select : access.mode === 'edit' ? c.edit : access.mode === 'reselect' ? c.reselect : null;
  const canShowActions = !loading && !error;
  const preview = lines.slice(0, 2).map(line => `${line.name} × ${line.quantity}`).join(' · ');
  return <article className={`${styles.roundItem}${canShowActions ? ` ${styles.roundClickable}` : ''}`}>
    <div className={styles.roundBody}>
    <div className={styles.roundTitle}>
      <h3>{canShowActions ? <a className={styles.roundView} href={csaRoundHref(round.id, locale)} aria-label={`${label ?? c.view}: ${round.name}`}>{round.name}</a> : round.name}</h3>
    </div>
    <dl className={styles.roundDates}>
      <div className={styles.roundDelivery}><dt>{c.delivery}:</dt><dd>{formatDateTime(round.deliveryAt)}</dd></div>
      <div><dt>{c.window}:</dt><dd>{formatDateTime(round.opensAt)} → {formatDateTime(round.closesAt)}</dd></div>
      {selection?.reopenUntil && <div className={styles.roundDeadline}><dt>{c.deadline}:</dt><dd>{formatDateTime(selection.reopenUntil)}</dd></div>}
    </dl>
    {loading ? <p className={styles.roundFeedback} role="status">{c.loading}</p> : error ? <div className={styles.roundFeedback} role="alert">
      <p>{csaRoundError(error, locale)}</p><Button small variant="outline" onClick={onRetry}>{c.retry}</Button>
    </div> : <>
      {lines.length > 0 && <p className={styles.roundPreview}>
        {preview}{lines.length > 2 ? ` · +${lines.length - 2} ${c.more}` : ''}
      </p>}
      {round.cancellationReason && <p className={styles.roundFeedback}>{c.reason}: {round.cancellationReason}</p>}
    </>}
    {canShowActions && selection?.orderId && <ActionLink small variant="plain" className={styles.roundOrder} href={`/store/orders/${selection.orderId}/${locale}?from=csa`}>{c.order}</ActionLink>}
    </div>
    <div className={styles.roundStatus}>
      <Status status={terminal === 'cancelled' ? 'cancelled' : terminal === 'delivered' ? 'delivered' : access.mode === 'reselect' ? 'pending' : 'neutral'} label={c.states[state]}/>
    </div>
  </article>;
}
