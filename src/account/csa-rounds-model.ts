import {AccountApiError} from "./account-api.ts";

export const CSA_SELECTION_MAX_LINES = 100;

export type CsaRound = {
  id:string; sequence:number; name:string; opensAt:string; closesAt:string; deliveryAt:string;
  status:"draft"|"scheduled"|"open"|"closed"|"delivery"|"cancelled";
  serverTime:string; cancellationReason:string|null;
};
export type CsaSelectionLine = {productId:string;quantity:number;name:string;unitLabel:string;quotaGroupId:string;quotaCost:number};
export type CsaSelection = {
  id:string;roundId:string;membershipId:string;state:"selecting"|"locked"|"reselecting"|"confirmed"|"cancelled"|"delivered";
  revision:number;orderId:string|null;reopenUntil:string|null;serverTime:string;lines:CsaSelectionLine[];
};
export type CsaProduct = {id:string;name:string;unitSize:string;unitLabel:string;imageUrl:string|null;availableQuantity:number;quotaGroupId:string;quotaGroupName:string;quotaCost:number};
export type CsaRoundProducts = {round:CsaRound;selection:CsaSelection|null;products:CsaProduct[];quota:{groupId:string;availableUnits:number}[]};

type RecordValue=Record<string,unknown>;
function invalid():never {throw new AccountApiError("invalid_response",502);}
export function csaRecord(value:unknown):RecordValue {if(!value||typeof value!=="object"||Array.isArray(value))return invalid();return value as RecordValue;}
function text(value:unknown):string {if(typeof value!=="string"||!value)return invalid();return value;}
function uuid(value:unknown):string {const result=text(value);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result))return invalid();return result;}
function date(value:unknown):string {const result=text(value);if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(result)||!Number.isFinite(Date.parse(result)))return invalid();return result;}
export function csaInteger(value:unknown,min=0):number {if(typeof value!=="number"||!Number.isSafeInteger(value)||value<min)return invalid();return value;}
function nullable<T>(value:unknown,parse:(v:unknown)=>T):T|null {return value===null?null:parse(value);}
export function pointHundredths(value:unknown):number {
  if(typeof value!=="number"&&typeof value!=="string")return invalid();
  if(typeof value==="number"&&!Number.isFinite(value))return invalid();
  const input=String(value);if(!/^\d+(?:\.\d{1,2})?$/.test(input))return invalid();
  const [whole,fraction=""]=input.split(".");
  const result=BigInt(whole)*BigInt(100)+BigInt(fraction.padEnd(2,"0"));
  if(result>BigInt(Number.MAX_SAFE_INTEGER))return invalid();return Number(result);
}
function points(value:unknown,min=0):number {const result=pointHundredths(value)/100;return result<min?invalid():result;}
export function parseCsaRound(value:unknown):CsaRound {
  const row=csaRecord(value),status=text(row.status);
  if(!["draft","scheduled","open","closed","delivery","cancelled"].includes(status))return invalid();
  const opensAt=date(row.opens_at),closesAt=date(row.closes_at),deliveryAt=date(row.delivery_at);
  if(!(Date.parse(opensAt)<Date.parse(closesAt)&&Date.parse(closesAt)<Date.parse(deliveryAt)))return invalid();
  return {id:uuid(row.id),sequence:csaInteger(row.sequence,1),name:text(row.name),opensAt,closesAt,deliveryAt,status:status as CsaRound["status"],serverTime:date(row.server_time),cancellationReason:nullable(row.cancellation_reason,text)};
}
export function parseCsaSelection(value:unknown):CsaSelection {
  const row=csaRecord(value),state=text(row.state);
  if(!["selecting","locked","reselecting","confirmed","cancelled","delivered"].includes(state)||!Array.isArray(row.lines))return invalid();
  const reopenUntil=nullable(row.reopen_until,date);if(state==="reselecting"&&reopenUntil===null)return invalid();
  const lines=row.lines.map(value=>{const line=csaRecord(value);return {productId:uuid(line.product_id),quantity:csaInteger(line.quantity,1),name:text(line.name),unitLabel:text(line.unit_label),quotaGroupId:uuid(line.quota_group_id),quotaCost:points(line.quota_cost,.01)};});
  if(new Set(lines.map(line=>line.productId)).size!==lines.length)return invalid();
  return {id:uuid(row.id),roundId:uuid(row.round_id),membershipId:uuid(row.membership_id),state:state as CsaSelection["state"],revision:csaInteger(row.revision),orderId:nullable(row.order_id,uuid),reopenUntil,serverTime:date(row.server_time),lines};
}
export function parseCsaProduct(value:unknown):CsaProduct {
  const row=csaRecord(value),group=csaRecord(row.csa_quota_group),unitSize=text(row.unit_size);
  if(!/^\d+(?:\.\d+)?$/.test(unitSize)||Number(unitSize)<=0||!Number.isFinite(Number(unitSize)))return invalid();
  return {id:uuid(row.id),name:text(row.name),unitSize,unitLabel:text(row.unit_label),imageUrl:row.primary_image===null?null:text(csaRecord(row.primary_image).url),availableQuantity:csaInteger(row.available_quantity),quotaGroupId:uuid(group.id),quotaGroupName:text(group.name),quotaCost:points(group.cost,.01)};
}
export function parseCsaQuota(value:unknown):CsaRoundProducts["quota"] {
  if(!Array.isArray(value))return invalid();return value.map(value=>{const row=csaRecord(value);return {groupId:uuid(row.product_id),availableUnits:points(row.available_units)};});
}
export function selectionAccess({round,selection,eligible,serverNow}:{round:CsaRound;selection:CsaSelection|null;eligible:boolean;serverNow:number}):{mode:"readonly"|"select"|"edit"|"reselect";deadline:string|null} {
  const readonly={mode:"readonly" as const,deadline:null};
  if(!Number.isFinite(serverNow)||round.status==="cancelled"||round.status==="draft"||(selection&&!["selecting","reselecting"].includes(selection.state)))return readonly;
  if(selection?.state==="reselecting")return selection.reopenUntil&&serverNow<Date.parse(selection.reopenUntil)&&serverNow<Date.parse(round.deliveryAt)?{mode:"reselect",deadline:selection.reopenUntil}:readonly;
  if((!selection&&!eligible)||serverNow<Date.parse(round.opensAt)||serverNow>=Date.parse(round.closesAt))return readonly;
  return {mode:selection?.lines.length?"edit":"select",deadline:round.closesAt};
}
