import type {Locale} from "@/types";
import {parseCsaTerms,type CsaTermsDocument} from "./csa-terms-model.ts";

export async function fetchCsaTerms(locale:Locale,signal?:AbortSignal):Promise<CsaTermsDocument>{
  const response=await fetch(`/api/csa-terms?locale=${locale}`,{cache:"no-store",signal});
  if(!response.ok)throw new Error(`CSA terms HTTP ${response.status}`);
  const terms=parseCsaTerms(await response.json());
  if(terms.locale!==locale)throw new Error("CSA terms locale mismatch");
  return terms;
}
