import {Icon} from "@/components/UI";
import type {Testimonial} from "@/lib/testimonials";
import {TESTIMONIALS_COPY} from "@/data/testimonials-copy";
import type {Locale} from "@/types";

export function StoryTag({story,locale}:{story:Testimonial;locale:Locale}){
  const copy=TESTIMONIALS_COPY[locale];
  return <span className={`status testimonials-tag is-${story.type}`}>{story.type==="farmer"?copy.tagFarmer:copy.tagCustomer}</span>;
}
export function StoryImage({story,alt,sizes}:{story:Testimonial;alt:string;sizes:string}){
  if(!story.image)return <span className="testimonials-image-fallback" aria-hidden="true"><Icon name="message" size={28}/></span>;
  const sources=[...story.image.variants].filter(v=>v.width>0).sort((a,b)=>a.width-b.width);
  return <img alt={alt} width={story.image.width} height={story.image.height} loading="lazy" sizes={sizes} src={sources[0]?.url??story.image.url} srcSet={sources.length?sources.map(v=>`${v.url} ${v.width}w`).join(", "):undefined}/>;
}
export function StoryCard({story,locale,onOpen,variant="list"}:{story:Testimonial;locale:Locale;onOpen:(story:Testimonial,button:HTMLButtonElement)=>void;variant?:"list"|"featured"|"preview"}){
  const copy=TESTIMONIALS_COPY[locale];
  return <button type="button" className={`testimonials-${variant}-card`} aria-label={copy.openStory.replace("{name}",story.display_name)} onClick={event=>onOpen(story,event.currentTarget)}>
    <span className={`testimonials-${variant}-media`}><StoryImage story={story} alt={copy.imageAlt.replace("{name}",story.display_name)} sizes="(min-width:1024px) 30vw, (min-width:640px) 46vw, calc(100vw - 32px)"/><StoryTag story={story} locale={locale}/></span>
    <span className={`testimonials-${variant}-content`}><span className="testimonials-quote-icon"><Icon name="quote" size={17}/></span><q>{story.quote}</q><span className="testimonials-list-person"><span><strong>{story.display_name}</strong><small>{story.role}{story.location?` · ${story.location}`:""}</small></span><span aria-hidden="true" className="testimonials-card-arrow"><Icon name="arrow" size={16}/></span></span></span>
  </button>;
}
