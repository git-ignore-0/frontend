import type {CSA, CSAUsage, Locale, Paged} from "@/types";
import {accountApi, AccountApiError} from "./account-api.ts";

export {AccountApiError} from "./account-api.ts";

type JsonRecord=Record<string,unknown>;
type PaymentType="full"|"installment";

function record(value:unknown):JsonRecord{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new AccountApiError("invalid_response",502);
  return value as JsonRecord;
}
function string(value:unknown):string{
  if(typeof value!=="string"||!value)throw new AccountApiError("invalid_response",502);
  return value;
}
function optionalString(value:unknown):string|undefined{
  return typeof value==="string"&&value?value:undefined;
}
function integer(value:unknown,minimum=0):number{
  if(!Number.isInteger(value)||Number(value)<minimum)throw new AccountApiError("invalid_response",502);
  return Number(value);
}
function decimal(value:unknown):string{
  const result=string(value);
  if(!/^\d+(?:\.\d+)?$/.test(result))throw new AccountApiError("invalid_response",502);
  return result;
}
function page(value:unknown){
  const meta=record(value);
  const current=integer(meta.page,1),size=integer(meta.page_size,1),total=integer(meta.total);
  return {total,nextCursor:current*size<total?String(current+1):null};
}
function cursorPage(cursor?:string|null){return cursor&&/^[1-9]\d*$/.test(cursor)?Number(cursor):1;}

function usageRows(value:unknown):CSAUsage[]{
  if(!Array.isArray(value))throw new AccountApiError("invalid_response",502);
  return value.flatMap(entryValue=>{
    const entry=record(entryValue),lines=entry.lines;
    if(!Array.isArray(lines))throw new AccountApiError("invalid_response",502);
    const entryId=string(entry.id),date=string(entry.created_at),status=string(entry.status),orderId=optionalString(entry.order_id);
    return lines.map((lineValue,index)=>{
      const line=record(lineValue);
      return {id:`${entryId}:${index}`,date,orderId,productName:string(line.product_name),quantity:integer(line.units,1),unit:optionalString(line.unit_label_vi),unitEn:optionalString(line.unit_label_en),status};
    });
  });
}

export async function getCsaUsagePage({locale,cursor}:{locale:Locale;cursor?:string|null;limit?:number}):Promise<Paged<CSAUsage>>{
  const payload=await accountApi(`csa-usage?locale=${locale}&page=${cursorPage(cursor)}`);
  const meta=page(payload.meta);
  return {items:usageRows(payload.data),...meta};
}

async function optionalContract(membershipId:string,locale:Locale):Promise<CSA["contract"]>{
  try{
    const payload=await accountApi(`memberships/${membershipId}/contract`),data=record(payload.data);
    const locales=Array.isArray(data.available_locales)?data.available_locales.filter(value=>value==="vi"||value==="en"):[];
    return {number:string(data.reference_code),signedAt:optionalString(data.issued_at),status:string(data.status),downloadUrl:locales.includes(locale)?`/api/account/memberships/${membershipId}/contract/pdf?locale=${locale}`:undefined};
  }catch(error){
    if(error instanceof AccountApiError&&error.status===404)return undefined;
    throw error;
  }
}

export async function getCSA(locale:Locale):Promise<CSA|null>{
  const currentPayload=await accountApi(`csa-current?locale=${locale}`);
  if(currentPayload.data===null)return null;
  const current=record(currentPayload.data),membershipId=string(current.id);
  const [quotaPayload,usage,contract]=await Promise.all([
    accountApi(`csa-quota?locale=${locale}`),
    getCsaUsagePage({locale,cursor:"1"}),
    optionalContract(membershipId,locale),
  ]);
  const quotaData=record(quotaPayload.data);
  if(!Array.isArray(quotaData.products))throw new AccountApiError("invalid_response",502);
  return {
    id:membershipId,
    planName:string(current.package_name),
    description:optionalString(current.package_description),
    status:string(current.status),
    startDate:string(current.start_date),
    endDate:string(current.end_date),
    durationMonths:integer(current.duration_months,1),
    monthlyPriceVnd:decimal(current.monthly_price_vnd),
    totalPriceVnd:decimal(current.total_price_vnd),
    contract,
    quotas:quotaData.products.map(value=>{const item=record(value);return {productName:string(item.product_name),total:integer(item.quota_units_per_cycle),remaining:integer(item.remaining_units),unit:optionalString(item.unit_label_vi),unitEn:optionalString(item.unit_label_en)};}),
    usage:usage.items,
    pagination:{usage:{nextCursor:usage.nextCursor,total:usage.total}},
  };
}

export type CsaQuote={
  quoteToken:string;expiresAt:string;requestCode:string;
  payment:{amount:string;bankCode:string;bankName:string;accountNumber:string;accountName:string;transferContent:string};
  summary:{paymentType:PaymentType;totalAmount:string;initialPaymentAmount:string;installmentCount:number};
  terms:{version:string;locale:string;hash:string};
  qr:{acqId:string;accountNo:string;accountName:string;amount:string;addInfo:string;format:string;template:string};
};

function quoteFrom(value:unknown):CsaQuote{
  const data=record(value),payment=record(data.payment),summary=record(data.payment_summary),terms=record(data.terms),qr=record(data.qr_payload);
  const paymentType=string(summary.payment_type);
  if(paymentType!=="full"&&paymentType!=="installment")throw new AccountApiError("invalid_response",502);
  return {quoteToken:string(data.quote_token),expiresAt:string(data.expires_at),requestCode:string(data.request_code),payment:{amount:decimal(payment.amount),bankCode:string(payment.bank_code),bankName:string(payment.bank_name),accountNumber:string(payment.account_number),accountName:string(payment.account_name),transferContent:string(payment.transfer_content)},summary:{paymentType,totalAmount:decimal(summary.total_amount),initialPaymentAmount:decimal(summary.initial_payment_amount),installmentCount:integer(summary.installment_count,1)},terms:{version:string(terms.version),locale:string(terms.locale),hash:string(terms.hash)},qr:{acqId:string(qr.acqId),accountNo:string(qr.accountNo),accountName:string(qr.accountName),amount:decimal(qr.amount),addInfo:string(qr.addInfo),format:string(qr.format),template:string(qr.template)}};
}

export async function createCsaPaymentQuote(input:{packageId:string;priceOptionId:string;paymentPlanId:string|null;locale:Locale}):Promise<CsaQuote>{
  const payload=await accountApi("csa-payment-quotes",{method:"POST",body:JSON.stringify({package_id:input.packageId,price_option_id:input.priceOptionId,...(input.paymentPlanId?{payment_plan_id:input.paymentPlanId}:{}),terms_accepted:true,terms_locale:input.locale})});
  return quoteFrom(payload.data);
}

export type CsaPurchaseConfirmation={id:string;requestCode:string;status:string;packageName:string;durationMonths:number;amount:string;initialPaymentAmount:string;expiresAt:string};
export async function confirmCsaTransfer(quoteToken:string):Promise<CsaPurchaseConfirmation>{
  const payload=await accountApi("csa-confirm-transfer",{method:"POST",body:JSON.stringify({quote_token:quoteToken})}),data=record(payload.data),pkg=record(data.package_snapshot),option=record(data.price_option_snapshot);
  return {id:string(data.id),requestCode:string(data.request_code),status:string(data.status),packageName:string(pkg.name),durationMonths:integer(option.duration_months,1),amount:decimal(data.amount),initialPaymentAmount:decimal(data.initial_payment_amount),expiresAt:string(data.expires_at)};
}
