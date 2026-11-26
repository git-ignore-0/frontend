"use client";

import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {useAuth} from '@/auth/AuthProvider';
import {useNFV} from '@/state/NFVContext';
import {AccountApiError} from '@/account/account-api';
import {getRoundProducts, getRoundSelection, getRoundsPage, isCsaMutationOutcomeUnknown} from '@/account/csa-rounds-service';
import {selectionAccess, type CsaProduct, type CsaRoundProducts, type CsaSelection} from '@/account/csa-rounds-model';
import {getStoreOrder} from '@/store/store-order-service';
import type {Locale} from '@/types';
import {draftLines, isSelectionDraftValid, quantityLimits, sameDraft, selectionProducts, usedPoints} from './csa-rounds-presentation';
import {CsaConfirmationError, submitCsaSelection} from './csa-round-submit';
import {useCsaServerClock} from './useCsaServerClock';

type SelectionSnapshot = CsaRoundProducts & {catalogError?: AccountApiError};

async function snapshot(
  roundId: string,
  locale: Locale,
  historyPage: {current: number | null},
  isCurrent: () => boolean,
): Promise<SelectionSnapshot | null> {
  try {
    return await getRoundProducts(roundId, locale);
  } catch (error) {
    if (!isCurrent()) return null;
    // History remains viewable when the shopping endpoint refuses access.
    // Its data must never restore editing rights denied by that endpoint.
    if (!(error instanceof AccountApiError) || ![404, 409].includes(error.status)) throw error;
    const selection = await getRoundSelection(roundId);
    if (!isCurrent()) return null;
    if (selection?.orderId) {
      const order = await getStoreOrder(selection.orderId);
      if (!isCurrent()) return null;
      if (order.csa?.round.id === roundId.toLowerCase() && order.csa.selection.id === selection.id) {
        return {round: order.csa.round, selection: order.csa.selection, products: [], quota: [], catalogError: error};
      }
    }
    const cachedPage = historyPage.current;
    const readPage = async (page: number) => {
      const result = await getRoundsPage(page);
      const round = result.items.find(item => item.id === roundId.toLowerCase());
      if (round) historyPage.current = page;
      return {result, round};
    };
    let lastPage = Infinity;
    if (cachedPage !== null) {
      const {result, round} = await readPage(cachedPage);
      if (!isCurrent()) return null;
      if (round) return {round, selection, products: [], quota: [], catalogError: error};
      lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
    }
    for (let page = 1; page <= lastPage; page++) {
      if (page === cachedPage) continue;
      const {result, round} = await readPage(page);
      if (!isCurrent()) return null;
      if (round) return {round, selection, products: [], quota: [], catalogError: error};
      lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
    }
    throw error;
  }
}

type MutationNotice = 'saveUncertain' | 'confirmUncertain' | 'confirmFailed';

export function useCsaRoundSelection(roundId: string, locale: Locale) {
  const auth = useAuth();
  const {data, refreshResource} = useNFV();
  const owner = auth.status === 'authenticated' ? auth.session?.subject : null;
  const key = `${owner ?? ''}:${roundId}:${locale}`;
  const [loaded, setLoaded] = useState<{key: string; data: SelectionSnapshot} | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [draftProducts, setDraftProducts] = useState<CsaProduct[]>([]);
  const [actionError, setActionError] = useState<unknown>(null);
  const [readError, setReadError] = useState<unknown>(null);
  const [notice, setNotice] = useState<MutationNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [needsReload, setNeedsReload] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const epoch = useRef(0);
  const lifecycle = useRef(0);
  const historyPage = useRef<{current: number | null}>({current: null});
  const reading = useRef(false);
  const mutation = useRef(false);
  const reloadRequired = useRef(false);
  const draftRef = useRef(draft);
  const snapshotRef = useRef<SelectionSnapshot | null>(null);
  const keyRef = useRef<string | null>(key);
  const current = loaded?.key === key ? loaded.data : null;
  const dirty = !!current && !sameDraft(draft, current.selection?.lines ?? []);

  const updateDraft = useCallback((next: Record<string, number>) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const requireReload = useCallback((required: boolean) => {
    reloadRequired.current = required;
    setNeedsReload(required);
  }, []);

  const clearSnapshot = useCallback(() => {
    snapshotRef.current = null;
    setLoaded(null);
    setDraftProducts([]);
    updateDraft({});
    setNotice(null);
    setNeedsReview(false);
    requireReload(false);
  }, [requireReload, updateDraft]);

  const applySnapshot = useCallback((next: SelectionSnapshot, replaceDraft: boolean) => {
    setLoaded({key, data: next});
    snapshotRef.current = next;
    if (replaceDraft) {
      setDraftProducts(next.products);
      updateDraft(Object.fromEntries(next.selection?.lines.map(line => [line.productId, line.quantity]) ?? []));
      return;
    }
    // Retain labels for unsaved choices that disappear. Only next.products grants capacity.
    const liveIds = new Set(next.products.map(product => product.id));
    const quantities = draftRef.current;
    setDraftProducts(products => [
      ...next.products,
      ...products.filter(product => (quantities[product.id] ?? 0) > 0 && !liveIds.has(product.id)),
    ]);
  }, [key, updateDraft]);

  const load = useCallback(async (replaceDraft = false, afterMutation = false) => {
    if (!owner || keyRef.current !== key || reading.current || (mutation.current && !afterMutation)) return;
    const id = ++epoch.current;
    const generation = lifecycle.current;
    const isCurrent = () => id === epoch.current && generation === lifecycle.current && keyRef.current === key;
    reading.current = true;
    setLoading(true);
    setReadError(null);
    try {
      const next = await snapshot(roundId, locale, historyPage.current, isCurrent);
      if (!next || !isCurrent()) return;
      const previous = snapshotRef.current;
      const saved = previous?.selection;
      const latest = next.selection;
      if (saved && latest?.id === saved.id && latest.revision < saved.revision) {
        throw new AccountApiError('invalid_response', 502);
      }
      const review = !!previous && !replaceDraft && (
        saved?.id !== latest?.id || saved?.revision !== latest?.revision || saved?.state !== latest?.state
      );
      applySnapshot(next, replaceDraft || !previous || !!next.catalogError);
      requireReload(false);
      if (next.catalogError) {
        setReadError(next.catalogError);
        setNeedsReview(false);
      } else if (review) {
        setNeedsReview(true);
      }
      if (saved && latest?.id === saved.id && latest.state === 'confirmed') {
        setNotice(value => value === 'confirmUncertain' || value === 'confirmFailed' ? null : value);
        setActionError(null);
      }
    } catch (caught) {
      if (!isCurrent()) return;
      setReadError(caught);
      if (caught instanceof AccountApiError && [401, 403, 404, 409].includes(caught.status)) {
        clearSnapshot();
        setActionError(null);
        if (caught.status === 401) auth.expire();
      } else {
        requireReload(true);
      }
    } finally {
      if (isCurrent()) {
        reading.current = false;
        setLoading(false);
      }
    }
  }, [owner, roundId, locale, key, auth, applySnapshot, clearSnapshot, requireReload]);

  const loadRef = useRef(load);
  useLayoutEffect(() => {loadRef.current = load;}, [load]);
  useLayoutEffect(() => {
    let active = true;
    keyRef.current = key;
    const requests = epoch;
    const generation = lifecycle;
    queueMicrotask(() => {
      if (!active) return;
      historyPage.current = {current: null};
      reading.current = false;
      mutation.current = false;
      clearSnapshot();
      setBusy(false);
      setLoading(true);
      setActionError(null);
      setReadError(null);
      void loadRef.current(true);
    });
    return () => {
      active = false;
      keyRef.current = null;
      requests.current++;
      generation.current++;
    };
  }, [key, clearSnapshot]);

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
    if (!current || !cutoff || !Number.isFinite(now) || now < Date.parse(cutoff) || mutation.current || reading.current) return;
    const token = `${key}:${cutoff}`;
    if (expiredRefresh.current === token) return;
    expiredRefresh.current = token;
    void loadRef.current();
  }, [current, cutoff, now, key]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'hidden' || mutation.current || reading.current) return;
      void loadRef.current(sameDraft(draftRef.current, snapshotRef.current?.selection?.lines ?? []));
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  function canEdit() {
    return !!current && snapshotRef.current === current && keyRef.current === key &&
      !reading.current && !mutation.current && !reloadRequired.current && !needsReview && access.mode !== 'readonly';
  }

  function changeQuantity(id: string, quantity: number) {
    if (!current || !canEdit() || !Number.isSafeInteger(quantity) || quantity < 0) return;
    const latest = draftRef.current;
    const previous = latest[id] ?? 0;
    if (quantity === previous) return;
    if (quantity > previous) {
      const totals = usedPoints(latest, selectionProducts(current, draftProducts));
      const limits = quantityLimits(current.products, latest, current.quota, totals);
      if (quantity > (limits[id] ?? 0)) return;
    }
    updateDraft({...latest, [id]: quantity});
  }

  function acceptReview() {
    if (!current || snapshotRef.current !== current || keyRef.current !== key ||
        reading.current || mutation.current || reloadRequired.current) return;
    setNeedsReview(false);
    setNotice(null);
    setActionError((previous: unknown) => previous instanceof AccountApiError && previous.code === 'csa_selection_stale' ? null : previous);
  }

  function applySavedSelection(snapshot: SelectionSnapshot, selection: CsaSelection) {
    const quantities = new Map(selection.lines.map(line => [line.productId, line.quantity]));
    const products = snapshot.products.flatMap(product => {
      if (!product.heldOnly) return [product];
      const quantity = quantities.get(product.id);
      return quantity ? [{...product, availableQuantity: Math.min(product.availableQuantity, quantity)}] : [];
    });
    applySnapshot({...snapshot, products, selection}, true);
  }

  async function submit(confirm = false) {
    if (!current || !canEdit() || (confirm && access.mode !== 'reselect')) return;
    const latest = draftRef.current;
    if (!confirm && sameDraft(latest, current.selection?.lines ?? [])) return;
    const lines = draftLines(latest);
    const limits = quantityLimits(current.products, latest, current.quota);
    if ((!lines.length && (confirm || !current.selection)) || !isSelectionDraftValid(lines, limits)) return;
    const generation = lifecycle.current;
    const isCurrent = () => generation === lifecycle.current && keyRef.current === key;
    mutation.current = true;
    setBusy(true);
    setActionError(null);
    setReadError(null);
    setNotice(null);

    try {
      const selected = await submitCsaSelection({roundId, selection: current.selection, lines, locale, confirm, isCurrent});
      if (!isCurrent()) return;
      applySavedSelection(current, selected);
      requireReload(true);
      await loadRef.current(false, true);
      if (isCurrent()) void refreshResource('csa');
    } catch (caught) {
      if (!isCurrent()) return;
      const confirmation = caught instanceof CsaConfirmationError ? caught : null;
      const failure = confirmation ? confirmation.reason : caught;
      if (failure instanceof AccountApiError && [401, 403].includes(failure.status)) {
        clearSnapshot();
        setReadError(failure);
        if (failure.status === 401) auth.expire();
        return;
      }
      const unknown = isCsaMutationOutcomeUnknown(failure);
      setActionError(unknown ? null : failure);
      if (confirmation) {
        applySavedSelection(current, confirmation.selection);
        setNotice(unknown ? 'confirmUncertain' : 'confirmFailed');
      } else if (unknown) {
        setNotice('saveUncertain');
      }
      const conflict = failure instanceof AccountApiError && [404, 409].includes(failure.status);
      if (confirmation || unknown || conflict) {
        requireReload(true);
        if (failure instanceof AccountApiError && failure.code === 'csa_selection_stale') setNeedsReview(true);
        await loadRef.current(false, true);
      }
    } finally {
      if (isCurrent()) {
        mutation.current = false;
        setBusy(false);
      }
    }
  }

  return {
    current, draft, draftProducts, changeQuantity, error: readError ?? actionError, notice, busy, loading, dirty,
    needsReload, needsReview, access, load: () => load(), acceptReview, submit, shippingAddress: data.shippingAddress,
  };
}
