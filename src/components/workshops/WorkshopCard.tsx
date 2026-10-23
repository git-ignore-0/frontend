import type {Locale} from "@/types";
import type {PublicWorkshop} from "@/types/workshop";
import {formatWorkshopDate} from "@/lib/workshop-date";
import {WORKSHOP_COPY} from "@/data/workshop-copy";
import {workshopDetailHref} from "@/lib/site-links";
import {Icon} from "@/components/UI";
/** Shared card: Home preview and the workshop calendar use the same data and formatter. */
export function WorkshopCard({item,locale,variant="preview"}:{item:PublicWorkshop;locale:Locale;variant?:"preview"|"calendar"}){
  const c=WORKSHOP_COPY[locale];
  const date=formatWorkshopDate(item,locale);
  const href=workshopDetailHref(locale,item.slug);
  if(variant==="preview")return <article className="home-workshop-card">
    <time className="home-workshop-date-tile" dateTime={item.start_at} aria-label={date.label}>
      <span className="home-workshop-date-day">{date.day}</span><span>{date.month}</span>
    </time>
    <div className="home-workshop-card-copy">
      <div className="home-workshop-meta"><span className="home-workshop-status">{c.status[item.status]}</span>
        <time dateTime={item.start_at}>{date.label}</time></div>
      <h3><a href={href}>{item.title}</a></h3><p>{item.summary}</p>
      {item.is_fallback&&<p className="home-fallback-note">{c.fallback}</p>}
      <a className="home-workshop-detail" href={href}>{c.details} <span aria-hidden="true">→</span></a>
    </div>
  </article>;
  return <article className="wk-calendar-card">
    <div className="wk-date-tile"><time dateTime={item.start_at} aria-label={date.label}><span className="wk-date-month">{date.month}</span><span className="wk-date-day">{date.day}</span></time><span className="wk-date-status">{c.status[item.status]}</span></div>
    <div className="wk-card-copy"><div className="wk-card-meta"><span className={`wk-status wk-status-${item.status}`}>{c.status[item.status]}</span><time dateTime={item.start_at}>{date.label}</time></div>
      <h3><a href={href}>{item.title}</a></h3><p>{item.summary}</p>
      {item.is_fallback&&<p className="wk-fallback-note">{c.fallback}</p>}
    </div>
    <div className="wk-card-action"><a className="btn btn-small nfv-button" href={href}>{c.details}<Icon name="arrow" size={14}/></a></div>
  </article>;
}
