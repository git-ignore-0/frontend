import type {Locale} from "../types";
import {accountApi,AccountApiError} from "./account-api.ts";
import {csaRecord,csaInteger,parseCsaRound,parseCsaSelection,parseCsaProducts,parseCsaQuota} from "./csa-rounds-model.ts";
import type {CsaRound,CsaSelection,CsaRoundProducts} from "./csa-rounds-model.ts";

function selectionForRound(value:unknown,roundId:string):CsaSelection {
  const selection=parseCsaSelection(value);
  if(selection.roundId!==roundId.toLowerCase())throw new AccountApiError("invalid_response",502);
  return selection;
}

export function isCsaMutationOutcomeUnknown(error: unknown): boolean {
  // These are the explicit rejection statuses returned by the CSA endpoints and Account BFF.
  return !(error instanceof AccountApiError) || ![400, 401, 403, 404, 409].includes(error.status);
}

export async function getRoundsPage(page=1):Promise<{items:CsaRound[];page:number;pageSize:number;total:number}> {
  const payload=await accountApi(`csa-rounds?page=${page}`),meta=csaRecord(payload.meta);
  if(!Array.isArray(payload.data))throw new AccountApiError("invalid_response",502);
  return {items:payload.data.map(parseCsaRound),page:csaInteger(meta.page,1),pageSize:csaInteger(meta.page_size,1),total:csaInteger(meta.total)};
}
export async function getRoundSelection(roundId:string):Promise<CsaSelection|null> {
  const payload=await accountApi(`csa-rounds/${roundId}/selection`);
  if(payload.data===null)return null;return selectionForRound(payload.data,roundId);
}
export async function getRoundHistory(roundId: string): Promise<Pick<CsaRoundProducts, "round" | "selection">> {
  const payload = await accountApi(`csa-rounds/${roundId}`);
  const round = parseCsaRound(payload.data);
  if (round.id !== roundId.toLowerCase()) throw new AccountApiError("invalid_response", 502);
  const selection = payload.selection === null ? null : selectionForRound(payload.selection, roundId);
  return {round, selection};
}
export async function getRoundProducts(roundId:string,locale:Locale):Promise<CsaRoundProducts> {
  const payload = await accountApi(`csa-rounds/${roundId}/products?locale=${locale}`);
  const round = parseCsaRound(payload.round);
  if (round.id !== roundId.toLowerCase()) throw new AccountApiError("invalid_response", 502);
  const selection = payload.selection === null ? null : selectionForRound(payload.selection, roundId);
  return {round, selection, products: parseCsaProducts(payload.data, selection), quota: parseCsaQuota(payload.quota)};
}
export async function saveRoundSelection({
  roundId, selectionId, lines, locale, expectedRevision,
}: {
  roundId: string; selectionId?: string; lines: {productId: string; quantity: number}[]; locale: Locale; expectedRevision: number;
}): Promise<CsaSelection> {
  const payload = await accountApi(`csa-rounds/${roundId}/selection`, {
    method: "PUT",
    body: JSON.stringify({
      lines: lines.map(line => ({product_id: line.productId, quantity: line.quantity})),
      locale,
      expected_revision: expectedRevision,
    }),
  });
  const selection = selectionForRound(payload.data, roundId);
  const requested = new Map(lines.map(line => [line.productId.toLowerCase(), line.quantity]));
  if ((selectionId !== undefined && selection.id !== selectionId.toLowerCase()) ||
    selection.revision !== expectedRevision + 1 ||
    (selection.state !== "selecting" && selection.state !== "reselecting") ||
    selection.lines.length !== lines.length ||
    selection.lines.some(line => requested.get(line.productId) !== line.quantity)) {
    throw new AccountApiError("invalid_response", 502);
  }
  return selection;
}
export async function confirmRoundSelection({
  selectionId, roundId, expectedRevision,
}: {
  selectionId: string; roundId?: string; expectedRevision: number;
}): Promise<CsaSelection> {
  const payload = await accountApi(`csa-selections/${selectionId}/confirm`, {
    method: "POST",
    body: JSON.stringify({expected_revision: expectedRevision}),
  });
  const selection = roundId === undefined ? parseCsaSelection(payload.data) : selectionForRound(payload.data, roundId);
  if (selection.id !== selectionId.toLowerCase() || selection.state !== "confirmed" || !selection.orderId ||
    (selection.revision !== expectedRevision && selection.revision !== expectedRevision + 1)) {
    throw new AccountApiError("invalid_response", 502);
  }
  return selection;
}
