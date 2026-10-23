import type {Locale} from "@/types";
import type {PublicWorkshop} from "@/types/workshop";
import {WORKSHOP_COPY} from "@/data/workshop-copy";
import {formatWorkshopDate} from "@/lib/workshop-date";
import {WorkshopRichText} from "@/components/workshops/WorkshopRichText";
import {ActionLink,Icon} from "@/components/UI";

function jsonLd(value:unknown){return JSON.stringify(value).replace(/</g,"\\u003c")}

export function WorkshopDetail({workshop,locale}:{workshop:PublicWorkshop;locale:Locale}){
  const c=WORKSHOP_COPY[locale],date=formatWorkshopDate(workshop,locale);
  const registrationOpen=workshop.status==="upcoming"&&Boolean(workshop.registration_url);
  const originalLocale=workshop.content_locale&&workshop.content_locale!==locale?workshop.content_locale:null;
  const eventStatus=workshop.status==="completed"?"https://schema.org/EventCompleted":"https://schema.org/EventScheduled";
  const structured={"@context":"https://schema.org","@type":"Event",name:workshop.title,description:workshop.summary,
    startDate:workshop.start_at,endDate:workshop.end_at,eventStatus,
    eventAttendanceMode:"https://schema.org/OfflineEventAttendanceMode",
    organizer:{"@type":"Organization",name:"Natural Farming Vietnam",url:"https://naturalfarmingvietnam.com"},
    offers:registrationOpen?{"@type":"Offer",url:workshop.registration_url,availability:"https://schema.org/InStock"}:undefined};
  return <>
    <main id="main-content" className="nfv-workshops nfv-workshop-detail">
      <div className="wk-detail-shell">
        <ActionLink className="wk-back-link" href={`/workshops/${locale}`} variant="plain" small>
          <Icon name="back" size={14}/>{c.back}
        </ActionLink>
        <header className="wk-detail-hero">
          <span className={`wk-status wk-status-${workshop.status}`}>{c.status[workshop.status]}</span>
          <h1>{workshop.title}</h1><p>{workshop.summary}</p>
        </header>
        {workshop.is_fallback&&<aside className="wk-fallback-banner"><p>{c.fallback}</p>
          {originalLocale&&<a href={`/workshops/${encodeURIComponent(workshop.slug)}/${originalLocale}`}>{c.readOriginal} →</a>}
        </aside>}
        <div className="wk-detail-layout">
          <article className="wk-detail-body">
            {workshop.body?<WorkshopRichText document={workshop.body}/>:<p className="wk-body-empty">{c.bodyUnavailable}</p>}
          </article>
          <aside className="wk-detail-facts" aria-label={c.title}>
            <dl><div><dt>{c.statusLabel}</dt><dd>{c.status[workshop.status]}</dd></div>
              <div><dt>{c.date}</dt><dd><time dateTime={workshop.start_at}>{date.label}</time></dd></div></dl>
            {registrationOpen&&<a className="btn nfv-button wk-register" href={workshop.registration_url||undefined} target="_blank" rel="noreferrer">{c.register}<span aria-hidden="true">↗</span></a>}
          </aside>
        </div>
      </div>
    </main>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(structured)}}/>
  </>;
}
