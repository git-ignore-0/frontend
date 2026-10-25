import type {CsaPackage,CsaPaymentPlan,CsaPriceOption} from "../csa/csa-packages-model";

export type CsaSelection={packageId:string;priceOptionId:string;paymentPlanId:string|null};
export type CsaSelectionSummary={
  packageId:string;
  priceOptionId:string;
  paymentPlanId:string|null;
  paymentType:"full"|"installment";
  totalAmount:string;
  initialPaymentAmount:string;
  installmentCount:number;
};

function defaultPaymentPlanId(option:CsaPriceOption):string|null{
  return option.payment_plans.find(plan=>plan.payment_type==="full")?.id??option.payment_plans[0]?.id??null;
}

function selectionForPackage(item:CsaPackage):CsaSelection|null{
  const option=item.price_options[0];
  return option?{packageId:item.id,priceOptionId:option.id,paymentPlanId:defaultPaymentPlanId(option)}:null;
}

export function createCsaSelection(packages:CsaPackage[]):CsaSelection|null{
  for(const item of packages){
    const selected=selectionForPackage(item);
    if(selected)return selected;
  }
  return null;
}

export function changeCsaPackage(packages:CsaPackage[],current:CsaSelection,packageId:string):CsaSelection{
  const item=packages.find(candidate=>candidate.id===packageId);
  return (item&&selectionForPackage(item))||current;
}

export function changeCsaPriceOption(packages:CsaPackage[],current:CsaSelection,priceOptionId:string):CsaSelection{
  const item=packages.find(candidate=>candidate.id===current.packageId);
  const option=item?.price_options.find(candidate=>candidate.id===priceOptionId);
  return option?{packageId:current.packageId,priceOptionId:option.id,paymentPlanId:defaultPaymentPlanId(option)}:current;
}

export function changeCsaPaymentPlan(packages:CsaPackage[],current:CsaSelection,paymentPlanId:string):CsaSelection{
  const item=packages.find(candidate=>candidate.id===current.packageId);
  const option=item?.price_options.find(candidate=>candidate.id===current.priceOptionId);
  return option?.payment_plans.some(plan=>plan.id===paymentPlanId)?{...current,paymentPlanId}:current;
}

function selectedPaymentPlan(option:CsaPriceOption,paymentPlanId:string|null):CsaPaymentPlan|null{
  if(paymentPlanId===null)return null;
  return option.payment_plans.find(plan=>plan.id===paymentPlanId)??null;
}

export function csaSelectionSummary(packages:CsaPackage[],selected:CsaSelection|null):CsaSelectionSummary|null{
  if(!selected)return null;
  const item=packages.find(candidate=>candidate.id===selected.packageId);
  if(!item)return null;
  const option=item.price_options.find(candidate=>candidate.id===selected.priceOptionId);
  if(!option)return null;
  const plan=selectedPaymentPlan(option,selected.paymentPlanId);
  if(selected.paymentPlanId!==null&&!plan)return null;
  if(selected.paymentPlanId===null&&option.payment_plans.length)return null;
  return {
    packageId:item.id,
    priceOptionId:option.id,
    paymentPlanId:plan?.id??null,
    paymentType:plan?.payment_type??"full",
    totalAmount:plan?.total_amount??option.total_price_vnd,
    initialPaymentAmount:plan?.initial_payment_amount??option.total_price_vnd,
    installmentCount:plan?.installment_count??1,
  };
}
