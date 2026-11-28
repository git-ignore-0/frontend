/** Matches the Store checkout line quantity limit enforced by the backend. */
export const STORE_MAX_LINE_QUANTITY=999;
export const STORE_MAX_ORDER_LINES=50;

/** Limit a new purchase without changing the capacity returned by the backend. */
export function storePurchaseLimit(available: number|null|undefined): number {
 return typeof available==="number"&&Number.isSafeInteger(available)&&available>0?Math.min(available,STORE_MAX_LINE_QUANTITY):0;
}

export function isStorePurchaseQuantity(quantity: number,available: number|null|undefined): boolean {
 return Number.isSafeInteger(quantity)&&quantity>0&&quantity<=storePurchaseLimit(available);
}
