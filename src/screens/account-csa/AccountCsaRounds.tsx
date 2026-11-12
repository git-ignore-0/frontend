"use client";

import {useCallback, useEffect, useId, useRef, useState} from 'react';
import {Button, DataState, Icon, Section} from '@/components/UI';
import {useNFV} from '@/state/NFVContext';
import {useAuth} from '@/auth/AuthProvider';
import {getRoundsPage, getRoundSelection} from '@/account/csa-rounds-service';
import type {CsaRound, CsaSelection} from '@/account/csa-rounds-model';
import {csaRoundsCopy, csaRoundError} from '@/data/csa-rounds-copy';
import {roundsExpanded} from './csa-rounds-presentation';
import {CsaRoundItem} from './CsaRoundItem';
import styles from './csa-rounds.module.css';

type SelectionState = {selection?: CsaSelection | null; error?: unknown; loading: boolean; receivedAt?: number};
type RoundsPage = {items: CsaRound[]; total: number; pageSize: number; receivedAt: number; epoch: number; key: string};

export function AccountCsaRounds() {
  const {data, ui, accountSessionKey} = useNFV();
  const auth = useAuth();
  const owner = auth.session?.subject;
  const ready = auth.status === 'authenticated' && !!owner && accountSessionKey === owner;
  const activePane = ui.page === 'account' && ui.accountTab === 'csa' && !(ui.accountHubOpen && typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches);
  const c = csaRoundsCopy(ui.locale);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState<RoundsPage | null>(null);
  const key = `${owner ?? ''}:${ui.locale}:${page}`;
  const result = loaded?.key === key ? loaded : null;
  const loadedKey = useRef<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [selections, setSelections] = useState<Record<string, SelectionState>>({});
  const [retry, setRetry] = useState(0);
  const epoch = useRef(0);
  const selectionEpoch = useRef(0);
  const selectionRequests = useRef(new Map<string, {epoch: number; sequence: number; listEpoch: number}>());
  const listId = useId();

  const load = useCallback(async () => {
    if (!ready || !owner || !activePane) return;
    const current = ++epoch.current;
    if (loadedKey.current !== key) setSelections({});
    setError(null);
    try {
      const next = await getRoundsPage(page);
      if (epoch.current === current) {
        const lastPage = Math.max(1, Math.ceil(next.total / next.pageSize));
        if (page > lastPage) {setPage(lastPage); return;}
        loadedKey.current = key;
        setLoaded({...next, receivedAt: Date.now(), epoch: current, key});
      }
    } catch (caught) {
      if (epoch.current === current) setError(caught);
    }
  }, [page, ready, owner, activePane, key]);

  useEffect(() => {
    const counter = selectionEpoch;
    const requests = selectionRequests;
    return () => {counter.current++; requests.current.clear();};
  }, [load]);
  useEffect(() => {
    const counter = epoch;
    void load();
    return () => {counter.current++;};
  }, [load, retry]);
  useEffect(() => {
    if (!ready || !activePane) return;
    const focus = () => {
      if (document.visibilityState !== 'hidden') setRetry(n => n + 1);
    };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [ready, activePane]);

  const visible = roundsExpanded(result?.total ?? 0, expanded);
  const loadSelection = useCallback(async (id: string) => {
    if (!ready || !activePane) return;
    const current = selectionEpoch.current;
    const requests = selectionRequests.current;
    const sequence = (requests.get(id)?.sequence ?? 0) + 1;
    requests.set(id, {epoch: current, sequence, listEpoch: result?.epoch ?? epoch.current});
    const isCurrent = () => current === selectionEpoch.current && requests.get(id)?.sequence === sequence;
    setSelections(rows => ({...rows, [id]: {...rows[id], loading: rows[id]?.selection === undefined, error: undefined}}));
    try {
      const selection = await getRoundSelection(id);
      if (isCurrent()) setSelections(rows => ({...rows, [id]: {loading: false, selection, receivedAt: Date.now()}}));
    } catch (caught) {
      if (isCurrent()) setSelections(rows => ({...rows, [id]: {...rows[id], loading: false, error: caught}}));
    }
  }, [ready, activePane, result?.epoch]);

  useEffect(() => {
    if (!ready || !activePane || !visible || !result) return;
    for (const round of result.items) {
      if (selectionRequests.current.get(round.id)?.listEpoch !== result.epoch || selectionRequests.current.get(round.id)?.epoch !== selectionEpoch.current) void loadSelection(round.id);
    }
  }, [ready, activePane, visible, result, loadSelection]);

  const active = data.csa?.active;
  const eligible = !!active && (active.status === 'active' || active.status === 'scheduled');
  if (!ready) return null;
  if (!result && !error) return <Section title={c.title} className="benefit-section"><DataState kind="loading" title={c.loading}/></Section>;
  if (error && !result) return (
    <Section title={c.title} className="benefit-section">
      <DataState kind="error" title={csaRoundError(error, ui.locale)} action={{label: c.retry, onClick: () => setRetry(n => n + 1)}}/>
    </Section>
  );
  if (!result) return null;
  if (result.total === 0) return active || data.csa?.frozen
    ? <Section title={c.title} className="benefit-section"><p className="sm muted">{c.empty}</p></Section>
    : null;

  return (
    <section className={`acc-section benefit-section csa-upcoming-section ${styles.roundSection}`} aria-labelledby={`${listId}-heading`}>
      <h2 id={`${listId}-heading`} className={styles.roundSectionHeading}>
        {result.total > 1 ? <button type="button" className={styles.roundToggle} aria-expanded={visible} aria-controls={listId} onClick={() => setExpanded(value => !value)}>
          <span>{c.title}</span><span className={styles.roundCount}>{result.total} {c.rounds}</span><Icon name="chev" size={14}/>
        </button> : <span className={styles.roundHeadingLabel}>{c.title}</span>}
      </h2>
      {Boolean(error) && <div className={styles.roundFeedback} role="alert">
        <p>{csaRoundError(error, ui.locale)}</p><Button small variant="outline" onClick={() => setRetry(n => n + 1)}>{c.retry}</Button>
      </div>}
      {visible && <div id={listId} className={styles.rounds}>
        {result.items.map(round => {
          const state = selections[round.id];
          return <CsaRoundItem key={round.id} round={round} selection={state?.selection} error={state?.error}
            loading={!state || state.loading} active={activePane} eligible={eligible} receivedAt={state?.selection ? state.receivedAt : result.receivedAt}
            locale={ui.locale} onRetry={() => void loadSelection(round.id)}/>;
        })}
        {result.total > result.pageSize && <nav className={styles.roundPagination} aria-label={c.title}>
          <Button small variant="outline" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>{c.previous}</Button>
          <span>{c.page} {page}/{Math.ceil(result.total / result.pageSize)}</span>
          <Button small variant="outline" disabled={page * result.pageSize >= result.total} onClick={() => setPage(n => n + 1)}>{c.next}</Button>
        </nav>}
      </div>}
    </section>
  );
}
