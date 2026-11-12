import type {Locale} from '../../types.ts';
import type {CsaSelection} from '../../account/csa-rounds-model.ts';
import {saveRoundSelection,confirmRoundSelection} from '../../account/csa-rounds-service.ts';
import {sameDraft} from './csa-rounds-presentation.ts';
type Input={roundId:string;selection:CsaSelection|null;lines:{productId:string;quantity:number}[];locale:Locale;confirm:boolean};
export class CsaConfirmationError extends Error{
 readonly selection:CsaSelection;readonly reason:unknown;
 constructor(selection:CsaSelection,reason:unknown){super('csa_confirmation_failed');this.selection=selection;this.reason=reason;}
}
export async function submitCsaSelection(input:Input,api={save:saveRoundSelection,confirm:confirmRoundSelection}):Promise<CsaSelection>{
 let selected=input.selection;
 if(!input.confirm||!selected||!sameDraft(Object.fromEntries(input.lines.map(line=>[line.productId,line.quantity])),selected.lines)){
  selected=await api.save({roundId:input.roundId,lines:input.lines,locale:input.locale,expectedRevision:selected?.revision??0});
 }
 if(!input.confirm)return selected;
 try{return await api.confirm({selectionId:selected.id,expectedRevision:selected.revision})}catch(error){throw new CsaConfirmationError(selected,error)}
}
