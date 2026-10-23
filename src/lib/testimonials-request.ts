import type {TestimonialsPageData} from "./testimonials";

export type TestimonialsLoadState={key:string;status:"loading"|"success"|"error";data:TestimonialsPageData|null};
export type TestimonialsRetryState={key:string;nonce:number}|null;

/** Only the currently requested filter/page may contribute results to the UI. */
export function visibleTestimonials(state:TestimonialsLoadState,queryKey:string):TestimonialsPageData|null {
  return state.key===queryKey && state.status==="success" ? state.data : null;
}

/** A retry nonce tells the BFF to bypass its production upstream cache. */
export function testimonialsRetrySuffix(retryNumber:number):string {
  return retryNumber>0?`&retry=${retryNumber}`:"";
}

export function testimonialsRetryNumber(state:TestimonialsRetryState,key:string):number {
  return state?.key===key?state.nonce:0;
}

export function nextTestimonialsRetry(state:TestimonialsRetryState,key:string):Exclude<TestimonialsRetryState,null> {
  return {key,nonce:state?.key===key?state.nonce+1:1};
}
