export type CsaTrackerStatus="pending"|"payment_confirmed"|"approved"|"rejected"|"expired";
export type CsaTrackerRefundStatus="not_applicable"|"pending"|"completed";
export type CsaContractLocale="vi"|"en";
export type CsaContractVersion={id:string;versionNumber:number;versionReason:"issued"|"payment_confirmed"|"membership_revoked";contractStatus:"active"|"revoked";createdAt:string;availableLocales:CsaContractLocale[];paidAmount?:string;remainingAmount?:string;paidCycles?:number;totalCycles?:number};
export type CsaTrackerResult={referenceCode:string;referenceType:"request"|"contract";status:CsaTrackerStatus;packageName:string;priceOptionName:string;durationMonths:number;amount:string;currency:string;createdAt:string;expiresAt:string|null;paymentConfirmedAt:string|null;contract:{id:string;referenceCode:string;status:"active"|"revoked"}|null;contractStatus?:"active"|"revoked";membershipStartDate?:string;membershipEndDate?:string;availablePdfLocales:CsaContractLocale[];versions:CsaContractVersion[];pdfAvailable:boolean;rejectionReason?:string;rejectedAt?:string|null;refundStatus?:CsaTrackerRefundStatus};
export type CsaPaymentPlan={id:string;name:string;paymentType:"full"|"installment";totalAmount:string;installmentCount:number;initialPaymentAmount:string|null;installments:{sequence:number;amount:string;cycleCount:number}[]};
export type CsaPaymentSummary={totalAmount:string;paidAmount:string;remainingAmount:string;confirmedInstallments:number;installmentCount:number;paidCycles:number;totalCycles:number};
export type CsaPaymentRecord={installmentSequence:number;amountDue:string;amountPaid:string|null;cycleCount:number;status:"pending"|"reported"|"confirmed"|"rejected"|"overdue";dueAt:string|null;confirmedAt:string|null;rejectedAt:string|null};
export type CsaTrackerContract={id:string;referenceCode:string;source:string;status:"active"|"revoked";packageName:string;priceOptionName:string;amount:string;currency:string;durationMonths:number;startDate:string;endDate:string;issuedAt:string;revokedAt:string|null;revocationReason:string|null;availablePdfLocales:CsaContractLocale[];pdfAvailable:boolean;currentVersion:CsaContractVersion|null;versions:CsaContractVersion[];paymentPlan:CsaPaymentPlan|null;paymentSummary:CsaPaymentSummary|null;payments:CsaPaymentRecord[]};

export type CsaTrackerErrorCode="csa_tracker_lookup_unavailable"|"csa_tracker_session_expired"|"csa_tracker_contract_unavailable"|"csa_contract_pdf_unavailable"|"invalid_contract_locale"|"rate_limited"|"invalid_response"|"request_failed";

export class CsaTrackerApiError extends Error{
  readonly code:CsaTrackerErrorCode;
  readonly status:number;
  constructor(code:CsaTrackerErrorCode,status:number){super(code);this.name="CsaTrackerApiError";this.code=code;this.status=status;}
}

type JsonRecord=Record<string,unknown>;
const basePath="/api/account/csa-contract-tracker";
function invalid():never{throw new CsaTrackerApiError("invalid_response",502);}
function record(value:unknown):JsonRecord{if(!value||typeof value!=="object"||Array.isArray(value))invalid();return value as JsonRecord;}
function string(value:unknown):string{if(typeof value!=="string"||!value)invalid();return value;}
function optionalString(value:unknown):string|undefined{return typeof value==="string"&&value?value:undefined;}
function nullableString(value:unknown):string|null{if(value===null)return null;return string(value);}
function nullableBlankString(value:unknown):string|null{if(value===null||value==="")return null;return string(value);}
function integer(value:unknown,minimum=0):number{if(!Number.isInteger(value)||Number(value)<minimum)invalid();return Number(value);}
function decimal(value:unknown):string{const result=string(value);if(!/^\d+(?:\.\d+)?$/.test(result))invalid();return result;}
function boolean(value:unknown):boolean{if(typeof value!=="boolean")invalid();return value;}
function choice<T extends string>(value:unknown,allowed:readonly T[]):T{const result=string(value) as T;if(!allowed.includes(result))invalid();return result;}
function locales(value:unknown):CsaContractLocale[]{if(!Array.isArray(value))invalid();return value.map(item=>choice(item,["vi","en"]));}
function optionalInteger(value:unknown):number|undefined{return value===undefined?undefined:integer(value);}
function optionalDecimal(value:unknown):string|undefined{return value===undefined?undefined:decimal(value);}

function contractVersion(value:unknown):CsaContractVersion{
  const item=record(value);
  return {id:string(item.id),versionNumber:integer(item.version_number,1),versionReason:choice(item.version_reason,["issued","payment_confirmed","membership_revoked"]),contractStatus:choice(item.contract_status,["active","revoked"]),createdAt:string(item.created_at),availableLocales:locales(item.available_locales),paidAmount:optionalDecimal(item.paid_amount),remainingAmount:optionalDecimal(item.remaining_amount),paidCycles:optionalInteger(item.paid_cycles),totalCycles:optionalInteger(item.total_cycles)};
}
function versions(value:unknown):CsaContractVersion[]{if(value===undefined)return[];if(!Array.isArray(value))invalid();return value.map(contractVersion);}
function optionalLocales(value:unknown):CsaContractLocale[]{return value===undefined?[]:locales(value);}

function trackerResult(value:unknown):CsaTrackerResult{
  const item=record(value),pkg=record(item.package_snapshot),option=record(item.price_option_snapshot);
  const contractValue=item.contract===null?null:record(item.contract);
  return {referenceCode:string(item.reference_code),referenceType:choice(item.reference_type,["request","contract"]),status:choice(item.status,["pending","payment_confirmed","approved","rejected","expired"]),packageName:string(pkg.name),priceOptionName:string(option.name),durationMonths:integer(item.duration_months,1),amount:decimal(item.amount),currency:string(item.currency),createdAt:string(item.created_at),expiresAt:nullableString(item.expires_at),paymentConfirmedAt:nullableString(item.payment_confirmed_at),contract:contractValue?{id:string(contractValue.id),referenceCode:string(contractValue.reference_code),status:choice(contractValue.status,["active","revoked"])}:null,contractStatus:item.contract_status===undefined?undefined:choice(item.contract_status,["active","revoked"] as const),membershipStartDate:optionalString(item.membership_start_date),membershipEndDate:optionalString(item.membership_end_date),availablePdfLocales:optionalLocales(item.available_pdf_locales),versions:versions(item.versions),pdfAvailable:boolean(item.pdf_available),rejectionReason:optionalString(item.rejection_reason),rejectedAt:item.rejected_at===undefined?undefined:nullableString(item.rejected_at),refundStatus:item.refund_status===undefined?undefined:choice(item.refund_status,["not_applicable","pending","completed"] as const)};
}

function paymentPlan(value:unknown):CsaPaymentPlan|null{
  if(value===null||value===undefined)return null;
  const item=record(value);if(!Array.isArray(item.installments))invalid();
  return {id:string(item.id),name:string(item.name),paymentType:choice(item.payment_type,["full","installment"]),totalAmount:decimal(item.total_amount),installmentCount:integer(item.installment_count,1),initialPaymentAmount:item.initial_payment_amount===null?null:decimal(item.initial_payment_amount),installments:item.installments.map(value=>{const row=record(value);return {sequence:integer(row.sequence,1),amount:decimal(row.amount),cycleCount:integer(row.cycle_count,1)};})};
}
function paymentSummary(value:unknown):CsaPaymentSummary|null{
  if(value===null||value===undefined)return null;const item=record(value);
  return {totalAmount:decimal(item.total_amount),paidAmount:decimal(item.paid_amount),remainingAmount:decimal(item.remaining_amount),confirmedInstallments:integer(item.confirmed_installments),installmentCount:integer(item.installment_count,1),paidCycles:integer(item.paid_cycles),totalCycles:integer(item.total_cycles,1)};
}
function payments(value:unknown):CsaPaymentRecord[]{
  if(value===undefined)return[];if(!Array.isArray(value))invalid();
  return value.map(entry=>{const item=record(entry);return {installmentSequence:integer(item.installment_sequence,1),amountDue:decimal(item.amount_due),amountPaid:item.amount_paid===null?null:decimal(item.amount_paid),cycleCount:integer(item.cycle_count,1),status:choice(item.status,["pending","reported","confirmed","rejected","overdue"]),dueAt:nullableString(item.due_at),confirmedAt:nullableString(item.confirmed_at),rejectedAt:nullableString(item.rejected_at)};});
}
function trackerContract(value:unknown):CsaTrackerContract{
  const item=record(value);
  return {id:string(item.id),referenceCode:string(item.reference_code),source:string(item.source),status:choice(item.status,["active","revoked"]),packageName:string(item.package_name_snapshot),priceOptionName:string(item.price_option_name_snapshot),amount:decimal(item.amount_snapshot),currency:string(item.currency_snapshot),durationMonths:integer(item.duration_months_snapshot,1),startDate:string(item.start_date),endDate:string(item.end_date),issuedAt:string(item.issued_at),revokedAt:nullableString(item.revoked_at),revocationReason:nullableBlankString(item.revocation_reason),availablePdfLocales:locales(item.available_pdf_locales),pdfAvailable:boolean(item.pdf_available),currentVersion:item.current_version===null||item.current_version===undefined?null:contractVersion(item.current_version),versions:versions(item.versions),paymentPlan:paymentPlan(item.payment_plan),paymentSummary:paymentSummary(item.payment_summary),payments:payments(item.payments)};
}

async function responseError(response:Response):Promise<CsaTrackerApiError>{
  const payload=await response.json().catch(()=>null),body=payload&&typeof payload==="object"&&!Array.isArray(payload)?payload as JsonRecord:{},errors=Array.isArray(body.errors)?body.errors:[],first=errors[0]&&typeof errors[0]==="object"?errors[0] as JsonRecord:{};
  const raw=typeof first.code==="string"?first.code:typeof body.error==="string"?body.error:"request_failed";
  const allowed:CsaTrackerErrorCode[]= ["csa_tracker_lookup_unavailable","csa_tracker_session_expired","csa_tracker_contract_unavailable","csa_contract_pdf_unavailable","invalid_contract_locale","invalid_response","request_failed"];
  return new CsaTrackerApiError(response.status===429?"rate_limited":allowed.includes(raw as CsaTrackerErrorCode)?raw as CsaTrackerErrorCode:"request_failed",response.status);
}
async function trackerJson(path:string,init?:RequestInit):Promise<unknown>{
  let response:Response;try{response=await fetch(`${basePath}/${path}`,{...init,credentials:"same-origin",cache:"no-store",headers:{...(init?.body?{"Content-Type":"application/json","X-NFV-Public-Request":"1"}:{}),...init?.headers}});}catch{throw new CsaTrackerApiError("request_failed",0);}
  if(!response.ok)throw await responseError(response);
  const payload=record(await response.json().catch(()=>invalid()));return payload.data;
}

export async function lookupCsaContract(input:{referenceCode:string;phone:string}):Promise<CsaTrackerResult>{
  return trackerResult(await trackerJson("lookup",{method:"POST",body:JSON.stringify({reference_code:input.referenceCode,phone:input.phone})}));
}
export function trackerContractMatchesResult(result:Pick<CsaTrackerResult,"contract">,contract:Pick<CsaTrackerContract,"id"|"referenceCode">):boolean{
  return result.contract?.id===contract.id&&result.contract.referenceCode===contract.referenceCode;
}
export async function getTrackedCsaContract():Promise<CsaTrackerContract>{return trackerContract(await trackerJson("contract"));}
export async function downloadTrackedCsaContract(locale:CsaContractLocale,versionId?:string):Promise<{blob:Blob;filename:string}>{
  let response:Response;try{response=await fetch(`${basePath}/contract/pdf?locale=${locale}${versionId?`&version_id=${encodeURIComponent(versionId)}`:""}`,{method:"GET",credentials:"same-origin",cache:"no-store"});}catch{throw new CsaTrackerApiError("request_failed",0);}
  if(!response.ok)throw await responseError(response);
  if(!response.headers.get("content-type")?.startsWith("application/pdf"))throw new CsaTrackerApiError("csa_contract_pdf_unavailable",502);
  const raw=response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1]??`csa-contract.${locale}.pdf`;
  const filename=raw.replace(/[\\/\r\n]/g,"-").trim()||`csa-contract.${locale}.pdf`;
  return {blob:await response.blob(),filename};
}
export function isTrackerSessionExpired(error:unknown):boolean{return error instanceof CsaTrackerApiError&&error.code==="csa_tracker_session_expired";}
