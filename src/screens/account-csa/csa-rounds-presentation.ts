import {CSA_SELECTION_MAX_LINES,pointHundredths} from '../../account/csa-rounds-model.ts';
import type {CsaProduct, CsaRoundProducts} from '../../account/csa-rounds-model.ts';

export type SelectionProduct = Pick<CsaProduct, 'id' | 'name' | 'unitLabel' | 'quotaGroupId' | 'quotaCost'> & Partial<Pick<CsaProduct, 'quotaGroupName'>>;

export function roundsExpanded(total: number, expanded: boolean): boolean {
  return total === 1 || total > 1 && expanded;
}

export function draftLines(draft: Record<string, number>) {
  return Object.entries(draft)
    .filter(([, quantity]) => quantity > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([productId, quantity]) => ({productId, quantity}));
}

export function sameDraft(draft: Record<string, number>, lines: {productId: string; quantity: number}[]): boolean {
  const saved = [...lines].filter(row => row.quantity > 0)
    .map(({productId, quantity}) => ({productId, quantity}))
    .sort((a, b) => a.productId.localeCompare(b.productId));
  return JSON.stringify(draftLines(draft)) === JSON.stringify(saved);
}

export function selectionProducts(snapshot: Pick<CsaRoundProducts, 'products' | 'selection'>, retained: SelectionProduct[]): SelectionProduct[] {
  const products = new Map<string, SelectionProduct>();
  for (const line of snapshot.selection?.lines ?? []) products.set(line.productId, {...line, id: line.productId});
  for (const product of retained) products.set(product.id, product);
  for (const product of snapshot.products) products.set(product.id, product);
  return [...products.values()];
}

export function usedPoints(draft: Record<string, number>, products: Pick<CsaProduct, 'id' | 'quotaGroupId' | 'quotaCost'>[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const product of products) {
    const quantity = draft[product.id] ?? 0;
    if (quantity > 0) result[product.quotaGroupId] = (result[product.quotaGroupId] ?? 0) + quantity * pointHundredths(product.quotaCost);
  }
  return result;
}

export function quantityLimits(
  products: Pick<CsaProduct, 'id' | 'quotaGroupId' | 'quotaCost' | 'availableQuantity'>[],
  draft: Record<string, number>,
  quota: {groupId: string; availableUnits: number}[],
  totals = usedPoints(draft, products),
): Record<string, number> {
  const availableByGroup = new Map(quota.map(row => [row.groupId, pointHundredths(row.availableUnits)]));
  const limits: Record<string, number> = {};
  const full = Object.values(draft).filter(quantity => quantity > 0).length >= CSA_SELECTION_MAX_LINES;
  for (const product of products) {
    if (full && !(draft[product.id] > 0)) {limits[product.id] = 0; continue;}
    const cost = pointHundredths(product.quotaCost);
    const available = availableByGroup.get(product.quotaGroupId) ?? 0;
    const total = totals[product.quotaGroupId] ?? 0;
    const own = (draft[product.id] ?? 0) * cost;
    limits[product.id] = cost > 0 ? Math.max(0, Math.min(product.availableQuantity, Math.floor((available - total + own) / cost))) : 0;
  }
  return limits;
}

export function pointsLabel(hundredths: number): string {
  return (hundredths / 100).toLocaleString('en-GB', {maximumFractionDigits: 2});
}
