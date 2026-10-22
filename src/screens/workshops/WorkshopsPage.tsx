"use client";
import {useNFV} from "@/state/NFVContext";
import type {Locale} from "@/types";
import type {PublicWorkshop} from "@/types/workshop";
import {WORKSHOP_COPY} from "@/data/workshop-copy";
import {WorkshopCard} from "@/components/workshops/WorkshopCard";
import {DataState} from "@/components/UI";
import {useWorkshops} from "./useWorkshops";
function WorkshopSection({items,locale,past=false}:{items:PublicWorkshop[];locale:Locale;past?:boolean}){
  const c=WORKSHOP_COPY[locale];
  return <section className={`wk-section${past?" wk-section-past":""}`} aria-labelledby={past?"wk-past":"wk-upcoming"}>
    <div className="wk-section-heading"><h2 id={past?"wk-past":"wk-upcoming"}>{past?c.past:c.upcoming}</h2><span className="wk-count">{c.count(items.length)}</span></div>
    {items.length?<div className="wk-grid">{items.map(item=><WorkshopCard key={item.id} item={item} locale={locale} variant="calendar"/>)}</div>:<div className="wk-state"><DataState compact title={past?c.emptyPast:c.emptyUpcoming}/></div>}
  </section>;
}
/** One Workshop listing screen; the public source site still owns individual event details. */
export function WorkshopsPage(){
  const {ui}=useNFV();
  const c=WORKSHOP_COPY[ui.locale];
  const {upcoming,past,state}=useWorkshops(ui.locale);
  return <main id="main-content" className="nfv-workshops">
    <div className="wk-shell">
      <header className="wk-hero"><h1>{c.title}</h1><p>{c.intro}</p></header>
      {state==="loading"?<div className="wk-page-state"><DataState kind="loading" title={c.loading}/></div>:
        state==="error"?<div className="wk-page-state"><DataState kind="error" title={c.unavailable}/></div>:<>
          <WorkshopSection items={upcoming} locale={ui.locale}/>
          <WorkshopSection items={past} locale={ui.locale} past/>
        </>}
    </div>
  </main>;
}
