import type {TestimonialsPageData} from "./testimonials";

export type TestimonialsLoadState={key:string;status:"loading"|"success"|"error";data:TestimonialsPageData|null};

/** Only the currently requested filter/page may contribute results to the UI. */
export function visibleTestimonials(state:TestimonialsLoadState,queryKey:string):TestimonialsPageData|null {
  return state.key===queryKey && state.status==="success" ? state.data : null;
}
