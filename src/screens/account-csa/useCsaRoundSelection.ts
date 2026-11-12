"use client";

import {useCallback, useEffect, useRef, useState} from 'react';
import {useAuth} from '@/auth/AuthProvider';
import {useNFV} from '@/state/NFVContext';
import {AccountApiError} from '@/account/account-api';
import {getRoundProducts, getRoundSelection, getRoundsPage} from '@/account/csa-rounds-service';
import {selectionAccess, type CsaProduct, type CsaRoundProducts, type CsaSelection} from '@/account/csa-rounds-model';
import {getStoreOrder} from '@/store/store-order-service';
import type {Locale} from '@/types';
import {sameDraft, draftLines} from './csa-rounds-presentation';
import {CsaConfirmationError, submitCsaSelection} from './csa-round-submit';
import {useCsaServerClock} from './useCsaServerClock';

type SelectionSnapshot = CsaRoundProducts & {catalogError?: AccountApiError};

async function snapshot(roundId: string, locale: Locale, historyPage: {current: number | null}): Promise<SelectionSnapshot> {
  try {
    return await getRoundProducts(roundId, locale);
  } catch (error) {
    // History remains viewable when the shopping endpoint refuses access.
    // Its data must never restore editing rights denied by that endpoint.
    if (!(error instanceof AccountApiError) || ![404, 409].includes(error.status)) throw error;
    const selection = await getRoundSelection(roundId);
    if (selection?.orderId) {
      const order = await getStoreOrder(selection.orderId);
      if (order.csa?.round.id === roundId) {
        return {round: order.csa.round, selection: order.csa.selection, products: [], quota: [], catalogError: error};
      }
    }
    const cachedPage = historyPage.current;
    const readPage = async (page: number) => {
      const result = await getRoundsPage(page);
      const round = result.items.find(item => item.id === roundId);
      if (round) historyPage.current = page;
      return {result, round};
    };
    let lastPage = Infinity;
    if (cachedPage !== null) {
      const {result, round} = await readPage(cachedPage);
      if (round) return {round, selection, products: [], quota: [], catalogError: error};
      lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
    }
    for (let page = 1; page <= lastPage; page++) {
      if (page === cachedPage) continue;
      const {result, round} = await readPage(page);
      if (round) return {round, selection, products: [], quota: [], catalogError: error};
      lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
    }
    throw error;
  }
}

export function useCsaRoundSelection(roundId: string, locale: Locale) {
  const auth = useAuth();
  const {data, refreshResource} = useNFV();
  const owner = auth.status === 'authenticated' ? auth.session?.subject : null;
  const key = `${owner ?? ''}:${roundId}:${locale}`;
  const [loaded, setLoaded] = useState<{key: string; data: SelectionSnapshot} | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [draftProducts, setDraftProducts] = useState<CsaProduct[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsReload, setNeedsReload] = useState(false);
  const epoch = useRef(0);
  const lifecycle = useRef(0);
  const historyPage = useRef<number | null>(null);
  const mutation = useRef(false);
  const draftRef = useRef(draft);
  const savedRef = useRef<CsaSelection | null>(null);
  const keyRef = useRef(key);
  const dirtyRef = useRef(false);
  const current = loaded?.key === key ? loaded.data : null;
  const dirty = !!current && !sameDraft(draft, current.selection?.lines ?? []);

  useEffect(() => {
    keyRef.current = key;
    draftRef.current = draft;
    dirtyRef.current = dirty;
  }, [key, draft, dirty]);

  const applySnapshot = useCallback((next: SelectionSnapshot, replaceDraft: boolean) => {
    const previous = savedRef.current;
    setLoaded({key, data: next});
    savedRef.current = next.selection;
    // Keep metadata for unsaved choices that disappear from the live catalogue.
    // They remain visible/removable without counting as available stock.
    setDraftProducts(products => {
      if (replaceDraft) return next.products;
      const liveIds = new Set(next.products.map(product => product.id));
      return [...next.products, ...products.filter(product => (draftRef.current[product.id] ?? 0) > 0 && !liveIds.has(product.id))];
    });
    if (next.catalogError) setError(next.catalogError);
    if (replaceDraft) {
      setDraft(Object.fromEntries(next.selection?.lines.map(line => [line.productId, line.quantity]) ?? []));
      setNeedsReload(false);
    } else {
      setNeedsReload((previous?.revision ?? 0) !== (next.selection?.revision ?? 0) || previous?.state !== next.selection?.state);
    }
  }, [key]);

  const load = useCallback(async (replaceDraft = true) => {
    if (!owner) return;
    const id = ++epoch.current;
    const generation = lifecycle.current;
    const isCurrent = () => id === epoch.current && generation === lifecycle.current && keyRef.current === key;
    setLoading(true);
    setError(null);
    try {
      const next = await snapshot(roundId, locale, historyPage);
      if (isCurrent()) applySnapshot(next, replaceDraft);
    } catch (caught) {
      if (isCurrent()) {
        setError(caught);
        if (caught instanceof AccountApiError && [403, 404, 409].includes(caught.status)) {
          setLoaded(previous => previous?.key === key
            ? {...previous, data: {...previous.data, catalogError: caught}}
            : previous);
        }
        if (caught instanceof AccountApiError && caught.status === 401) auth.expire();
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [owner, roundId, locale, key, auth, applySnapshot]);

  // Auth context identity may change; initial fetch is keyed to session and route.
  const loadRef = useRef(load);
  useEffect(() => {loadRef.current = load;}, [load]);
  useEffect(() => {
    let active = true;
    const requests = epoch;
    const generation = lifecycle;
    queueMicrotask(() => {
      if (!active) return;
      historyPage.current = null;
      savedRef.current = null;
      mutation.current = false;
      setLoaded(null);
      setDraft({});
      setDraftProducts([]);
      setBusy(false);
      setNeedsReload(false);

      void loadRef.current();
    });
    return () => {
      active = false;
      requests.current++;
      generation.current++;
    };
  }, [key]);

  const now = useCsaServerClock(current?.selection?.serverTime ?? current?.round.serverTime);
  const active = data.csa?.active;
  const eligible = !!current?.products.length || !!active && (active.status === 'active' || active.status === 'scheduled');
  const access = current && !current.catalogError
    ? selectionAccess({round: current.round, selection: current.selection, eligible, serverNow: now})
    : {mode: 'readonly' as const, deadline: null};
  const cutoff = current?.selection?.state === 'reselecting'
    ? current.selection.reopenUntil
    : current?.selection?.state === 'selecting' || !current?.selection ? current?.round.closesAt : null;
  const expiredRefresh = useRef('');
  useEffect(() => {
    if (!current || !cutoff || !Number.isFinite(now) || now < Date.parse(cutoff) || mutation.current) return;
    const token = `${key}:${cutoff}`;
    if (expiredRefresh.current === token) return;
    expiredRefresh.current = token;
    setNeedsReload(true);
    void loadRef.current(true);
  }, [current, cutoff, now, key]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'hidden' || mutation.current) return;
      void loadRef.current(!dirtyRef.current);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  async function submit(confirm = false) {
    if (mutation.current || !current || loading || needsReload || access.mode === 'readonly') return;
    const generation = lifecycle.current;
    const isCurrent = () => generation === lifecycle.current && keyRef.current === key;
    mutation.current = true;
    setBusy(true);
    setError(null);

    try {
      const selected = await submitCsaSelection({roundId, selection: savedRef.current, lines: draftLines(draftRef.current), locale, confirm});
      if (!isCurrent()) return;
      applySnapshot({...current, selection: selected}, true);
      await loadRef.current(true);
      if (isCurrent()) void refreshResource('csa');
    } catch (caught) {
      if (!isCurrent()) return;
      const failure = caught instanceof CsaConfirmationError ? caught.reason : caught;
      if (caught instanceof CsaConfirmationError) {
        applySnapshot({...current, selection: caught.selection}, true);
      }
      setError(failure);
      if (failure instanceof AccountApiError && failure.status === 401) auth.expire();
      if (failure instanceof AccountApiError && failure.status === 409) {
        if (['csa_stock_insufficient', 'csa_quota_insufficient'].includes(failure.code)) {
          try {
            const next = await snapshot(roundId, locale, historyPage);
            if (isCurrent()) applySnapshot(next, false);
          } catch {
            if (isCurrent()) setNeedsReload(true);
          }
        } else {
          setNeedsReload(true);
        }
      }
    } finally {
      if (isCurrent()) {
        mutation.current = false;
        setBusy(false);
      }
    }
  }
  return {current, draft, draftProducts, setDraft, error, busy, loading, dirty, needsReload, access, load, submit};
}
