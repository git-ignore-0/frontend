import type {StoreOrderStatus} from '../store/store-order-model.ts';

type OrdersView = {status?: StoreOrderStatus; page: number};
type ViewStorage = Pick<Storage, 'getItem' | 'setItem'>;
const statuses = new Set(['payment_pending', 'pending_review', 'pending_delivery', 'delivered', 'cancelled']);
const key = (owner: string) => `nfv:account-orders:view:${owner}`;
function storage(): ViewStorage | null {
  try {return typeof window === 'undefined' ? null : window.sessionStorage;} catch {return null;}
}

/** Only view preferences are stored; order data is always fetched again. */
export function readOrdersView(owner: string, target = storage()): OrdersView | null {
  if (!owner || !target) return null;
  try {
    const row = JSON.parse(target.getItem(key(owner)) ?? 'null');
    if (!row || !Number.isSafeInteger(row.page) || row.page < 1 || (row.status !== undefined && !statuses.has(row.status))) return null;
    return {status: row.status, page: row.page};
  } catch {return null;}
}
export function saveOrdersView(owner: string, view: OrdersView, target = storage()): void {
  if (!owner || !target) return;
  try {target.setItem(key(owner), JSON.stringify(view));} catch { /* Storage may be disabled. */ }
}
