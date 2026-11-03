import {csaUnits} from "../lib/csa-units.ts";
import type {CSA, CSAOverview, CSAUpcoming, CSAUsage, Locale, Paged} from "@/types";
import {accountApi, AccountApiError} from "./account-api.ts";
import type {CsaGuestIdentity} from "../screens/account-csa/csa-guest-buyer.ts";

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
function quotaUnits(value:unknown,minimum=0):number{
  try{const units=csaUnits(value);if(units<minimum)throw Error();return units}catch{throw new AccountApiError("invalid_response",502)}
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
      return {id:`${entryId}:${index}`,date,orderId,productName:string(line.product_name),quantity:quotaUnits(line.units,.01),unit:optionalString(line.unit_label_vi),unitEn:optionalString(line.unit_label_en),status};
    });
  });
}

export async function getCsaUsagePage({locale,cursor}:{locale:Locale;cursor?:string|null;limit?:number}):Promise<Paged<CSAUsage>>{
  const payload=await accountApi(`csa-usage?locale=${locale}&page=${cursorPage(cursor)}`);
  const meta=page(payload.meta);
  // API totals count transactions, while each UI row represents one produce group.
  // Keep the row total unknown until the UI has loaded every page.
  return {items:usageRows(payload.data),nextCursor:meta.nextCursor,total:null};
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

function upcomingItems(value:unknown):CSAUpcoming[]{
  if(!Array.isArray(value))throw new AccountApiError("invalid_response",502);
  return value.map(entryValue=>{
    const item=record(entryValue),kind=string(item.kind),status=string(item.status);
    if(kind==="membership"){
      if(status!=="scheduled")throw new AccountApiError("invalid_response",502);
      return {kind,id:string(item.id),planName:string(item.package_name),status,durationMonths:integer(item.duration_months,1),amount:decimal(item.total_price_vnd),currency:"VND",startDate:string(item.start_date),endDate:string(item.end_date)};
    }
    if(kind==="purchase_request"){
      if(status!=="pending"&&status!=="payment_confirmed")throw new AccountApiError("invalid_response",502);
      const expiresAt=optionalString(item.expires_at);
      return {kind,id:string(item.id),requestCode:string(item.request_code),planName:string(item.package_name),status,durationMonths:integer(item.duration_months,1),amount:decimal(item.amount),currency:string(item.currency),createdAt:string(item.created_at),...(expiresAt?{expiresAt}:{})};
    }
    throw new AccountApiError("invalid_response",502);
  });
}

export async function getCSA(locale:Locale):Promise<CSAOverview>{
  const overviewPayload=await accountApi(`csa-overview?locale=${locale}`),overview=record(overviewPayload.data);
  const upcoming=upcomingItems(overview.upcoming);
  if(overview.active_membership===null)return {active:null,upcoming};
  const current=record(overview.active_membership),membershipId=string(current.id);
  const [quotaPayload,usage,contract]=await Promise.all([
    accountApi(`csa-quota?locale=${locale}`),
    getCsaUsagePage({locale,cursor:"1"}),
    optionalContract(membershipId,locale),
  ]);
  const quotaData=record(quotaPayload.data);
  if(!Array.isArray(quotaData.products))throw new AccountApiError("invalid_response",502);
  const active:CSA={
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
    quotas:quotaData.products.map(value=>{const item=record(value);return {productName:string(item.product_name),total:integer(item.quota_units_per_cycle),remaining:quotaUnits(item.available_units),reserved:quotaUnits(item.reserved_units),used:quotaUnits(item.used_units),unit:optionalString(item.unit_label_vi),unitEn:optionalString(item.unit_label_en)};}),
    usage:usage.items,
    pagination:{usage:{nextCursor:usage.nextCursor,total:usage.total}},
  };
  return {active,upcoming};
}

export type CsaQuote={
  quoteToken:string;expiresAt:string;requestCode:string;
  coupon?:{code:string;discountAmount:string;contractTotalBeforeDiscount:string;paymentPlanTotalBeforeDiscount:string;initialPaymentBeforeDiscount:string;customerPayableTotal:string};
  payment:{amount:string;bankCode:string;bankName:string;accountNumber:string;accountName:string;transferContent:string};
  summary:{paymentType:PaymentType;totalAmount:string;initialPaymentAmount:string;installmentCount:number;installments:{sequence:number;amount:string;cycleCount:number}[]};
  terms:{version:string;locale:string;hash:string};
  qr:{acqId:string;accountNo:string;accountName:string;amount:string;addInfo:string;format:string;template:string};
};

export type CsaVoucherPreview={coupon:NonNullable<CsaQuote["coupon"]>;summary:CsaQuote["summary"]};

function wholeVnd(value:string):bigint{
 if(!/^\d+(?:\.0+)?$/.test(value))throw new AccountApiError("invalid_response",502);
 return BigInt(value.split(".")[0]);
}

function paymentSummaryFrom(data:JsonRecord):Pick<CsaQuote,"coupon"|"summary">{
 const summary=record(data.payment_summary),paymentType=string(summary.payment_type);
 if(paymentType!=="full"&&paymentType!=="installment")throw new AccountApiError("invalid_response",502);
 const installmentCount=integer(summary.installment_count,1);
 if(!Array.isArray(summary.installments))throw new AccountApiError("invalid_response",502);
 const installments=summary.installments.map((value,index)=>{const item=record(value),sequence=integer(item.sequence,1);if(sequence!==index+1)throw new AccountApiError("invalid_response",502);return {sequence,amount:decimal(item.amount),cycleCount:integer(item.cycle_count,1)};});
 if(installments.length!==installmentCount)throw new AccountApiError("invalid_response",502);
 const parsed:CsaQuote["summary"]={paymentType,totalAmount:decimal(summary.total_amount),initialPaymentAmount:decimal(summary.initial_payment_amount),installmentCount,installments};
 let coupon:CsaQuote["coupon"];
 if(data.coupon!==undefined&&data.coupon!==null){
  const value=record(data.coupon);
  coupon={code:string(value.code),discountAmount:decimal(value.discount_amount),contractTotalBeforeDiscount:decimal(summary.contract_total_before_discount),paymentPlanTotalBeforeDiscount:decimal(summary.payment_plan_total_before_discount),initialPaymentBeforeDiscount:decimal(summary.initial_payment_before_discount),customerPayableTotal:decimal(summary.customer_payable_total)};
  const amount=wholeVnd;
  const discount=amount(coupon.discountAmount),initial=amount(parsed.initialPaymentAmount),total=amount(coupon.customerPayableTotal);
  if(!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(coupon.code)||discount<=BigInt(0)||amount(decimal(summary.discount_amount))!==discount||amount(coupon.initialPaymentBeforeDiscount)-discount!==initial||amount(parsed.totalAmount)!==amount(coupon.paymentPlanTotalBeforeDiscount)||amount(coupon.paymentPlanTotalBeforeDiscount)-discount!==total||amount(installments[0].amount)!==initial||installments.reduce((sum,row)=>sum+amount(row.amount),BigInt(0))!==total)throw new AccountApiError("invalid_response",502);
 }
 return {summary:parsed,...(coupon?{coupon}:{})};
}

function quoteFrom(value:unknown):CsaQuote{
 const data=record(value),payment=record(data.payment),terms=record(data.terms),qr=record(data.qr_payload),result=paymentSummaryFrom(data);
 if(result.coupon&&(wholeVnd(decimal(payment.amount))!==wholeVnd(result.summary.initialPaymentAmount)||wholeVnd(decimal(qr.amount))!==wholeVnd(result.summary.initialPaymentAmount)))throw new AccountApiError("invalid_response",502);
 return {...result,quoteToken:string(data.quote_token),expiresAt:string(data.expires_at),requestCode:string(data.request_code),payment:{amount:decimal(payment.amount),bankCode:string(payment.bank_code),bankName:string(payment.bank_name),accountNumber:string(payment.account_number),accountName:string(payment.account_name),transferContent:string(payment.transfer_content)},terms:{version:string(terms.version),locale:string(terms.locale),hash:string(terms.hash)},qr:{acqId:string(qr.acqId),accountNo:string(qr.accountNo),accountName:string(qr.accountName),amount:decimal(qr.amount),addInfo:string(qr.addInfo),format:string(qr.format),template:string(qr.template)}};
}

export async function previewCsaVoucher(input:{packageId:string;priceOptionId:string;paymentPlanId:string|null;couponCode:string}):Promise<CsaVoucherPreview>{
 const code=input.couponCode.trim().toUpperCase();
 const payload=await accountApi("csa-voucher-preview",{method:"POST",body:JSON.stringify({package_id:input.packageId,price_option_id:input.priceOptionId,...(input.paymentPlanId?{payment_plan_id:input.paymentPlanId}:{}),coupon_code:code})});
 const result=paymentSummaryFrom(record(payload.data));
 if(!result.coupon||result.coupon.code!==code)throw new AccountApiError("invalid_response",502);
 return {...result,coupon:result.coupon};
}

export async function createCsaPaymentQuote(input:{packageId:string;priceOptionId:string;paymentPlanId:string|null;locale:Locale;termsVersion:string;termsHash:string;guestIdentity?:CsaGuestIdentity|null;couponCode?:string}):Promise<CsaQuote>{
  const payload=await accountApi("csa-payment-quotes",{method:"POST",body:JSON.stringify({package_id:input.packageId,price_option_id:input.priceOptionId,...(input.paymentPlanId?{payment_plan_id:input.paymentPlanId}:{}),terms_accepted:true,terms_locale:input.locale,terms_version:input.termsVersion,terms_hash:input.termsHash,...(input.couponCode?.trim()?{coupon_code:input.couponCode.trim().toUpperCase()}:{}),...(input.guestIdentity?{guest_identity:input.guestIdentity}:{})})});
  const quote=quoteFrom(payload.data);
  if(input.couponCode?.trim()&&quote.coupon?.code!==input.couponCode.trim().toUpperCase()||!input.couponCode?.trim()&&quote.coupon)throw new AccountApiError("invalid_response",502);
  return quote;
}

export type CsaPurchaseState="pending"|"payment_confirmed"|"approved"|"rejected"|"expired";
export type CsaPurchaseConfirmation={id:string;requestCode:string;status:CsaPurchaseState;packageName:string;durationMonths:number;amount:string;initialPaymentAmount:string;expiresAt:string};
export async function confirmCsaTransfer(quoteToken:string,guestIdentity?:CsaGuestIdentity|null):Promise<CsaPurchaseConfirmation>{
  const payload=await accountApi("csa-confirm-transfer",{method:"POST",body:JSON.stringify({quote_token:quoteToken,...(guestIdentity?{guest_identity:guestIdentity}:{})})}),data=record(payload.data),pkg=record(data.package_snapshot),option=record(data.price_option_snapshot);
  const status=string(data.status);if(status!=="pending"&&status!=="payment_confirmed"&&status!=="approved"&&status!=="rejected"&&status!=="expired")throw new AccountApiError("invalid_response",502);
  return {id:string(data.id),requestCode:string(data.request_code),status,packageName:string(pkg.name),durationMonths:integer(option.duration_months,1),amount:decimal(data.amount),initialPaymentAmount:decimal(data.initial_payment_amount),expiresAt:string(data.expires_at)};
}

export type CsaPurchaseStatus=Omit<CsaPurchaseConfirmation,"id">&{rejectionReason?:string;membershipStartDate?:string;membershipEndDate?:string};
export async function getCsaPurchaseStatus(input:{requestCode:string;phone:string}):Promise<CsaPurchaseStatus>{
  const payload=await accountApi("csa-purchase-status",{method:"POST",body:JSON.stringify({reference_code:input.requestCode,phone:input.phone})}),data=record(payload.data),pkg=record(data.package_snapshot);
  const status=string(data.status);if(status!=="pending"&&status!=="payment_confirmed"&&status!=="approved"&&status!=="rejected"&&status!=="expired")throw new AccountApiError("invalid_response",502);
  const membershipStartDate=optionalString(data.membership_start_date),membershipEndDate=optionalString(data.membership_end_date);
  return {requestCode:string(data.reference_code),status,packageName:string(pkg.name),durationMonths:integer(data.duration_months,1),amount:decimal(data.amount),initialPaymentAmount:decimal(data.initial_payment_amount),expiresAt:string(data.expires_at),rejectionReason:optionalString(data.rejection_reason),...(membershipStartDate?{membershipStartDate}:{}),...(membershipEndDate?{membershipEndDate}:{})};
}
