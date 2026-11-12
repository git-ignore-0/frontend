import type {Locale} from "../types";
import {accountApi,AccountApiError} from "./account-api.ts";
import {csaRecord,csaInteger,parseCsaRound,parseCsaSelection,parseCsaProduct,parseCsaQuota} from "./csa-rounds-model.ts";
import type {CsaRound,CsaSelection,CsaRoundProducts} from "./csa-rounds-model.ts";

function selectionForRound(value:unknown,roundId:string):CsaSelection {
  const selection=parseCsaSelection(value);
  if(selection.roundId.toLowerCase()!==roundId.toLowerCase())throw new AccountApiError("invalid_response",502);
  return selection;
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
export async function getRoundProducts(roundId:string,locale:Locale):Promise<CsaRoundProducts> {
  const payload=await accountApi(`csa-rounds/${roundId}/products?locale=${locale}`);
  if(!Array.isArray(payload.data))throw new AccountApiError("invalid_response",502);
  const round=parseCsaRound(payload.round);
  if(round.id.toLowerCase()!==roundId.toLowerCase())throw new AccountApiError("invalid_response",502);
  return {round,selection:payload.selection===null?null:selectionForRound(payload.selection,roundId),products:payload.data.map(parseCsaProduct),quota:parseCsaQuota(payload.quota)};
}
export async function saveRoundSelection({roundId,lines,locale,expectedRevision}:{roundId:string;lines:{productId:string;quantity:number}[];locale:Locale;expectedRevision:number}):Promise<CsaSelection> {
  const payload=await accountApi(`csa-rounds/${roundId}/selection`,{method:"PUT",body:JSON.stringify({lines:lines.map(line=>({product_id:line.productId,quantity:line.quantity})),locale,expected_revision:expectedRevision})});
  return selectionForRound(payload.data,roundId);
}
export async function confirmRoundSelection({selectionId,expectedRevision}:{selectionId:string;expectedRevision:number}):Promise<CsaSelection> {
  const payload=await accountApi(`csa-selections/${selectionId}/confirm`,{method:"POST",body:JSON.stringify({expected_revision:expectedRevision})});
  const selection=parseCsaSelection(payload.data);
  if(selection.id.toLowerCase()!==selectionId.toLowerCase())throw new AccountApiError("invalid_response",502);
  return selection;
}
