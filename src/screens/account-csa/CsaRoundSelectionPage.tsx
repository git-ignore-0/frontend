"use client";

import {ActionLink, Button, DataState, Status} from '@/components/UI';
import {StorePageHeading, StoreSection} from '@/components/store/StorePrimitives';
import {AuthGate} from '@/components/auth/AuthGate';
import {formatDateTime} from '@/lib/date-format';
import {CSA_SELECTION_MAX_LINES,pointHundredths} from '@/account/csa-rounds-model';
import {AccountApiError} from '@/account/account-api';
import {csaRoundsCopy, csaRoundError} from '@/data/csa-rounds-copy';
import type {Locale} from '@/types';
import {useCsaRoundSelection} from './useCsaRoundSelection';
import {CsaRoundProductList} from './CsaRoundProductList';
import {CsaRoundSelectionSummary} from './CsaRoundSelectionSummary';
import {draftLines, usedPoints, selectionProducts, quantityLimits} from './csa-rounds-presentation';
import {csaSelectionCopy} from './csa-selection-copy';
import styles from './csa-rounds.module.css';

function Selection({roundId, locale}: {roundId: string; locale: Locale}) {
  const c = csaRoundsCopy(locale);
  const copy = csaSelectionCopy(locale);
  const state = useCsaRoundSelection(roundId, locale);
  const {current, draft, setDraft, loading, busy, error, access, needsReload} = state;
  const parent = {href: `/account/${locale}?tab=csa`, label: c.back};

  if (!current) return <main className="main-content"><div className={`container store-commerce ${styles.page}`}>
    <StorePageHeading title={copy.title} locale={locale} parent={parent}/>
    <DataState kind={error ? 'error' : 'loading'} title={error ? csaRoundError(error, locale) : c.loading}
      action={error ? {label: c.retry, onClick: () => void state.load(true)} : undefined}/>
  </div></main>;

  const {round, selection} = current;
  const readonly = access.mode === 'readonly';
  const delivered = selection?.state === 'delivered';
  const cancelled = !delivered && (round.status === 'cancelled' || selection?.state === 'cancelled');
  const expectedCatalogClosure = round.status === 'cancelled' && current.catalogError?.status === 404 && error === current.catalogError;
  const displayError = expectedCatalogClosure ? null : error;
  const disabled = readonly || busy || loading || needsReload;
  const products = selectionProducts(current, state.draftProducts);
  const used = usedPoints(draft, products);
  const limits = quantityLimits(current.products, draft, current.quota, used);
  const availableProducts = new Map(current.products.map(product => [product.id, product]));
  const availablePoints = new Map(current.quota.map(row => [row.groupId, pointHundredths(row.availableUnits)]));
  const lines = draftLines(draft);
  const invalid = lines.length > CSA_SELECTION_MAX_LINES || lines.some(line => {
    const product = availableProducts.get(line.productId);
    return !product || line.quantity > product.availableQuantity;
  }) || Object.entries(used).some(([group, amount]) => amount > (availablePoints.get(group) ?? 0));
  const code = error instanceof AccountApiError ? error.code : '';
  const addressError = code.includes('address') || code.includes('shipping');
  const label = delivered ? 'delivered' : cancelled ? 'cancelled' : selection?.state
    ?? (Date.parse(round.serverTime) < Date.parse(round.opensAt) ? 'scheduled' : 'unselected');
  const reselect = access.mode === 'reselect';
  const saveDisabled = disabled || invalid || (!selection && lines.length === 0);
  const changeQuantity = (id: string, quantity: number) => {
    if (!disabled) setDraft(value => quantity > 0 && !(value[id] > 0) && Object.values(value).filter(q => q > 0).length >= CSA_SELECTION_MAX_LINES ? value : {...value, [id]: quantity});
  };

  return <main className="main-content"><div className={`container store-commerce ${styles.page}`}>
    <StorePageHeading title={readonly ? round.name : copy.title} locale={locale} parent={parent}>
      <Status status={delivered ? 'delivered' : cancelled ? 'cancelled' : 'neutral'} label={c.states[label]}/>
    </StorePageHeading>
    <section className={`store-panel ${styles.roundInfo}`} aria-label={round.name}>
      {!readonly && <strong className={styles.roundIdentity}>{round.name}</strong>}
      <dl className={styles.roundSchedule}>
        <div><dt>{c.window}</dt><dd>{formatDateTime(round.opensAt)} → {formatDateTime(round.closesAt)}</dd></div>
        <div><dt>{copy.delivery}</dt><dd><strong>{formatDateTime(round.deliveryAt)}</strong></dd></div>
        {selection?.reopenUntil && <div><dt>{c.deadline}</dt><dd>{formatDateTime(selection.reopenUntil)}</dd></div>}
      </dl>
      {round.cancellationReason && <p className={styles.cancellationReason}><span>{c.reason}</span>{round.cancellationReason}</p>}
    </section>

    {!readonly && lines.length >= CSA_SELECTION_MAX_LINES && <p role="status">{copy.lineLimit.replace("{max}", String(CSA_SELECTION_MAX_LINES))}</p>}
    {reselect && <p className={styles.reselectionNotice}>{copy.reselectHint}</p>}
    {Boolean(displayError) && <div className={styles.feedbackError} role="alert">
      <p>{csaRoundError(displayError, locale)}</p>
      {addressError && <ActionLink variant="plain" href={`/account/${locale}?tab=address`}>{c.address}</ActionLink>}
    </div>}
    {needsReload && <div className={styles.feedbackError} role="status">
      <p>{c.refreshNeeded}</p>
      <Button small variant="outline" disabled={busy || loading} onClick={() => void state.load(true)}>{c.retry}</Button>
    </div>}

    {readonly ? ((!cancelled || selection?.lines.length || selection?.orderId) ? <StoreSection title={c.summary}>
      {selection?.lines.length ? <ul className={styles.savedLines}>{selection.lines.map(line => <li key={line.productId}>
        <span>{line.name}</span><strong>× {line.quantity}</strong>
      </li>)}</ul> : <p>{c.noSelection}</p>}
      {selection?.orderId && <ActionLink variant="outline" href={`/store/orders/${selection.orderId}/${locale}?from=csa`}>{c.order}</ActionLink>}
    </StoreSection> : null) : <div className={styles.workspace}>
      <section aria-label={c.choose}>
        <CsaRoundProductList products={current.products} limits={limits} quota={current.quota} used={used} draft={draft}
          disabled={disabled} locale={locale} onChange={changeQuantity}/>
      </section>
      <StoreSection as="aside" title={c.summary} className={styles.summary}>
        <CsaRoundSelectionSummary snapshot={current} draft={draft} products={products} locale={locale} disabled={disabled}
          onRemove={id => changeQuantity(id, 0)}/>
        <div className={styles.save}>
          {reselect ? <>
            <Button loading={busy} disabled={saveDisabled || lines.length === 0} onClick={() => void state.submit(true)}>{c.confirm}</Button>
            <Button variant="plain" disabled={saveDisabled || !state.dirty} onClick={() => void state.submit(false)}>{copy.draft}</Button>
          </> : <Button loading={busy} disabled={saveDisabled || !state.dirty} onClick={() => void state.submit(false)}>{c.save}</Button>}
        </div>
      </StoreSection>
    </div>}
  </div></main>;
}

export function CsaRoundSelectionPage(props: {roundId: string; locale: Locale}) {
  return <AuthGate><Selection key={`${props.roundId}:${props.locale}`} {...props}/></AuthGate>;
}
