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
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCALES=new Set(["vi","en"]);

function text(value: unknown, limit=5000): string {
  return typeof value === "string"&&value.length<=limit?value:"";
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
  const displayName=text(row.display_name,240);
  const role=text(row.role,240),location=text(row.location,240),quote=text(row.quote,800);
  const requestedLocale=text(row.requested_locale,2),contentLocale=text(row.content_locale,2);
  const availableLocales=Array.isArray(row.available_locales)?row.available_locales:[];
  if (!UUID.test(id)||!displayName||!role||!location||!quote||(row.type!=="customer"&&row.type!=="farmer")||
      !LOCALES.has(requestedLocale)||!LOCALES.has(contentLocale)||availableLocales.length===0||availableLocales.some(value=>!LOCALES.has(String(value)))||
      typeof row.is_fallback!=="boolean"||typeof row.published_at!=="string"||!Number.isFinite(Date.parse(row.published_at))) return null;
  const image=object(row.image);
  if(row.image!==null&&!image)return null;
  const url=image?safeImageUrl(image.url):"";
  const width=image?Number(image.width):0,height=image?Number(image.height):0;
  if(image&&(!url||!Number.isInteger(width)||width<1||!Number.isInteger(height)||height<1||!Array.isArray(image.variants)))return null;
  const variants=image && Array.isArray(image.variants) ? image.variants.map(item=>{
    const variant=object(item);
    const src=variant?safeImageUrl(variant.url):"";
    const variantWidth=variant?Number(variant.width):0,variantHeight=variant?Number(variant.height):0;
    return src&&Number.isInteger(variantWidth)&&variantWidth>0&&Number.isInteger(variantHeight)&&variantHeight>0?{url:src,width:variantWidth}:null;
  }) : [];
  if(variants.some(item=>item===null))return null;
  return {id,type:row.type,display_name:displayName,role,location,quote,full_story:text(row.full_story,20000),
    image:image?{url,width,height,variants:variants as Array<{url:string;width:number}>}:null};
}
export function parseTestimonialsPage(input: unknown): TestimonialsPageData {
  const record=object(input);
  const meta=object(record?.meta);
  if (!record || !Array.isArray(record.data) || !meta) throw new Error("invalid_testimonials_payload");
  const page=Number(meta.page),pageSize=Number(meta.page_size),total=Number(meta.total);
  if(!Number.isInteger(page)||page<1||!Number.isInteger(pageSize)||pageSize<1||pageSize>50||!Number.isInteger(total)||total<0)throw new Error("invalid_testimonials_pagination");
  const data=record.data.map(parseTestimonial);
  if(data.some(item=>item===null))throw new Error("invalid_testimonials_item");
  return {data:data as Testimonial[],meta:{page,page_size:pageSize,total}};
}
export function parseFeaturedTestimonials(input:unknown):Testimonial[]{
  const record=object(input);
  if(!record||!Array.isArray(record.data))throw new Error("invalid_featured_payload");
  const data=record.data.slice(0,3).map(parseTestimonial);
  if(data.some(item=>item===null))throw new Error("invalid_featured_item");
  return data as Testimonial[];
}
export function parseTestimonialDetail(input:unknown):Testimonial {
  const record=object(input);
  const parsed=parseTestimonial(record?.data);
  if(!parsed||!parsed.full_story)throw new Error("invalid_story_payload");
  return parsed;
}
