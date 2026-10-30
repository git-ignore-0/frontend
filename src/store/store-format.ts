import type {StoreCsaQuotaGroup,StoreLocale} from "@/store/store-model";

export function formatUnitSize(value:string):string{
 const [integer,fraction]=value.split(".");
 if(fraction===undefined)return value;
 const compactFraction=fraction.replace(/0+$/,"");
 return compactFraction?`${integer}.${compactFraction}`:integer;
}

export function formatCsaQuotaBadge(group:StoreCsaQuotaGroup,locale:StoreLocale):string{
 const points=locale==="vi"?"điểm":group.cost===1?"point":"points";
 return `CSA – ${group.name} – ${group.cost} ${points}`;
}
