import { SITE_ORIGIN } from "@/config/site-brand";

export type StoryFilter = "all" | "customer" | "farmer";
export type TestimonialImageData = {
  url: string;
  width: number;
  height: number;
  variants: Array<{url: string; width: number}>;
};
export type Testimonial = {
  id: string;
  type: "customer" | "farmer";
  display_name: string;
  role: string;
  location: string;
  quote: string;
  full_story: string;
  image: TestimonialImageData | null;
};
export type TestimonialsPageData = {data:Testimonial[]; meta:{page:number;page_size:number;total:number}};

function text(value: unknown, limit=5000): string {
  return typeof value === "string" ? value.slice(0, limit) : "";
}
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string,unknown> : null;
}
function safeImageUrl(value: unknown): string {
  const src = text(value, 2000);
  try {
    const url = new URL(src, SITE_ORIGIN);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? url.href : "";
  } catch { return ""; }
}
export function parseTestimonial(input: unknown): Testimonial | null {
  const row=object(input);
  if (!row) return null;
  const id=text(row.id,100);
  const displayName=text(row.display_name,200);
  if (!id || !displayName || (row.type !== "customer" && row.type !== "farmer")) return null;
  const image=object(row.image);
  const url=image?safeImageUrl(image.url):"";
  const variants=image && Array.isArray(image.variants) ? image.variants.flatMap(item=>{
    const variant=object(item);
    const src=variant?safeImageUrl(variant.url):"";
    const width=variant?Number(variant.width):0;
    return src && Number.isFinite(width) && width>0 ? [{url:src,width}] : [];
  }) : [];
  return {id,type:row.type,display_name:displayName,role:text(row.role,300),location:text(row.location,300),
    quote:text(row.quote),full_story:text(row.full_story,15000),image:url?{url,width:Math.max(1,Number(image?.width)||800),height:Math.max(1,Number(image?.height)||600),variants}:null};
}
export function parseTestimonialsPage(input: unknown): TestimonialsPageData {
  const record=object(input);
  const meta=object(record?.meta);
  if (!record || !Array.isArray(record.data) || !meta) throw new Error("invalid_testimonials_payload");
  const page=Number(meta.page),pageSize=Number(meta.page_size),total=Number(meta.total);
  if(!Number.isInteger(page)||page<1||!Number.isInteger(pageSize)||pageSize<1||pageSize>50||!Number.isInteger(total)||total<0)throw new Error("invalid_testimonials_pagination");
  return {data:record.data.flatMap(item=>{const parsed=parseTestimonial(item);return parsed?[parsed]:[];}),meta:{page,page_size:pageSize,total}};
}
export function parseFeaturedTestimonials(input:unknown):Testimonial[]{
  const record=object(input);
  if(!record||!Array.isArray(record.data))throw new Error("invalid_featured_payload");
  return record.data.slice(0,3).flatMap(item=>{const parsed=parseTestimonial(item);return parsed?[parsed]:[];});
}
export function parseTestimonialDetail(input:unknown):Testimonial {
  const record=object(input);
  const parsed=parseTestimonial(record?.data);
  if(!parsed)throw new Error("invalid_story_payload");
  return parsed;
}
