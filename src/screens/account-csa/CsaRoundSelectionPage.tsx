"use client";

import {ActionLink, Button, DataState, Status} from '@/components/UI';
import {StorePageHeading, StoreSection} from '@/components/store/StorePrimitives';
import {AuthGate} from '@/components/auth/AuthGate';
import {siteAccountHref} from '@/auth/site-auth';
import {csaRoundHref} from '@/lib/csa-navigation';
import {formatDate,formatDateTime} from '@/lib/date-format';
import {CSA_SELECTION_MAX_LINES} from '@/account/csa-rounds-model';
import {AccountApiError} from '@/account/account-api';
import {csaRoundsCopy, csaRoundError} from '@/data/csa-rounds-copy';
import {copyText} from '@/data/account-copy';
import type {Locale} from '@/types';
import {useCsaRoundSelection} from './useCsaRoundSelection';
import {CsaRoundProductList} from './CsaRoundProductList';
import {CsaRoundSelectionSummary} from './CsaRoundSelectionSummary';
import {draftLines, isSelectionDraftValid, usedPoints, selectionProducts, quantityLimits} from './csa-rounds-presentation';
import {csaSelectionCopy} from './csa-selection-copy';
import styles from './csa-rounds.module.css';

function Selection({roundId, locale}: {roundId: string; locale: Locale}) {
  const c = csaRoundsCopy(locale);
  const copy = csaSelectionCopy(locale);
  const state = useCsaRoundSelection(roundId, locale);
  const {current, draft, changeQuantity, loading, busy, error, notice, access, needsReload, needsReview} = state;
  const parent = {href: `/account/${locale}?tab=csa`, label: c.back};

  const failure = error instanceof AccountApiError ? error : null;
  const code = failure?.code ?? '';
  const denied = failure?.status === 403 || code === 'csa_membership_unavailable';
  const signedOut = failure?.status === 401;
  const retry = {label: c.retry, onClick: () => void state.load()};

  if (!current) return <main className="main-content"><div className={`container store-commerce ${styles.page}`}>
    <StorePageHeading title={copy.title} locale={locale} parent={parent}/>
    <DataState kind={signedOut ? 'auth' : error ? 'error' : 'loading'}
      title={error ? csaRoundError(error, locale) : c.loading}
      action={error && !denied && !signedOut && !loading ? retry : undefined}/>
  </div></main>;

  const {round, selection} = current;
  const readonly = access.mode === 'readonly';
  const delivered = selection?.state === 'delivered';
  const cancelled = !delivered && (round.status === 'cancelled' || selection?.state === 'cancelled');
  const expectedCatalogClosure = round.status === 'cancelled' && current.catalogError?.status === 404 && error === current.catalogError;
  const displayError = expectedCatalogClosure ? null : error;
  const disabled = readonly || busy || loading || needsReload || needsReview;
  const products = selectionProducts(current, state.draftProducts);
  const used = usedPoints(draft, products);
  const limits = quantityLimits(current.products, draft, current.quota, used);
  const lines = draftLines(draft);
  const invalid = !isSelectionDraftValid(lines, limits);
  const addressError = code.includes('address') || code.includes('shipping');
  const address = code === 'store_shipping_address_required' ? state.shippingAddress : null;
  const missingContact = address ? (!address.phone.trim() ? 'phone' : !address.name.trim() ? 'name' : null) : null;
  const label = delivered ? 'delivered' : cancelled ? 'cancelled' : selection?.state
    ?? (Date.parse(round.serverTime) < Date.parse(round.opensAt) ? 'scheduled' : 'unselected');
  const reselect = access.mode === 'reselect';
  const saveDisabled = disabled || invalid || (!selection && lines.length === 0);

  const savedLines = selection?.lines.length ? <ul className={styles.savedLines}>
    {selection.lines.map(line => <li key={line.productId}>
      <span>{line.name}</span><strong>× {line.quantity}</strong>
    </li>)}
  </ul> : <p>{c.noSelection}</p>;
  const noticeText = notice ? c[notice] : undefined;
  let feedback;
  if (displayError && (denied || signedOut)) {
    feedback = <DataState compact kind={signedOut ? 'auth' : 'error'} title={csaRoundError(displayError, locale)}/>;
  } else if (loading) {
    feedback = <DataState compact kind="loading" title={c.verifying} description={noticeText}/>;
  } else if (needsReload) {
    feedback = <DataState compact kind="error" title={c.refreshNeeded} description={noticeText}
      action={busy ? undefined : retry}/>;
  } else if (!readonly && needsReview) {
    feedback = <StoreSection title={c.reviewLatest} className={styles.review}>
      <p role="status">{noticeText ?? c.reviewChanged}</p>
      {savedLines}
      <Button small variant="outline" disabled={busy} onClick={state.acceptReview}>{c.acceptLatest}</Button>
    </StoreSection>;
  } else if (readonly && (code === 'csa_selection_locked' || code === 'csa_reselection_expired')) {
    feedback = <p className={styles.notice} role="status">{c.locked}</p>;
  } else if (displayError) {
    feedback = <div className={`help-error ${styles.validation}`} role="alert">
      {noticeText && <p>{noticeText}</p>}
      <p>{missingContact
        ? copyText(locale, missingContact === 'phone' ? 'profile.phoneMissing' : 'profile.nameMissing')
        : csaRoundError(displayError, locale)}</p>
      {missingContact ? <ActionLink variant="plain" href={siteAccountHref(locale, csaRoundHref(roundId, locale))}>
        {copyText(locale, missingContact === 'phone' ? 'profile.addPhone' : 'profile.addName')}
      </ActionLink> : addressError && <ActionLink variant="plain" href={`/account/${locale}?tab=address`}>{c.address}</ActionLink>}
    </div>;
  } else if (noticeText || reselect) {
    feedback = <p className={styles.notice} role="status">{noticeText ?? copy.reselectHint}</p>;
  }

  return <main className="main-content"><div className={`container store-commerce ${styles.page}`}>
    <StorePageHeading title={readonly ? round.name : copy.title} locale={locale} parent={parent}>
      <Status status={delivered ? 'delivered' : cancelled ? 'cancelled' : 'neutral'} label={c.states[label]}/>
    </StorePageHeading>
    <section className={`store-panel ${styles.roundInfo}`} aria-label={round.name}>
      {!readonly && <strong className={styles.roundIdentity}>{round.name}</strong>}
      <dl className={styles.roundSchedule}>
        <div><dt>{c.window}</dt><dd>{formatDateTime(round.opensAt)} → {formatDateTime(round.closesAt)}</dd></div>
        <div><dt>{copy.delivery}</dt><dd><strong>{formatDate(round.deliveryDate)}</strong></dd></div>
        {selection?.reopenUntil && <div><dt>{c.deadline}</dt><dd>{formatDateTime(selection.reopenUntil)}</dd></div>}
      </dl>
      {round.cancellationReason && <p className={styles.cancellationReason}><span>{c.reason}</span>{round.cancellationReason}</p>}
    </section>

    {feedback && <div className={styles.feedback}>{feedback}</div>}

    {readonly ? ((!cancelled || selection?.lines.length || selection?.orderId) ? <StoreSection title={c.summary}>
      {savedLines}
      {selection?.orderId && <ActionLink variant="outline" href={`/store/orders/${selection.orderId}/${locale}?from=csa`}>{c.order}</ActionLink>}
    </StoreSection> : null) : <div className={styles.workspace}>
      <section aria-label={c.choose} aria-busy={loading || busy}>
        {lines.length >= CSA_SELECTION_MAX_LINES && <p className={styles.lineLimit} role="status">
          {copy.lineLimit.replace("{max}", String(CSA_SELECTION_MAX_LINES))}
        </p>}
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
