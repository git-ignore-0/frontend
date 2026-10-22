import type {Locale} from "@/types";
import type {PublicWorkshop} from "@/types/workshop";
import {WORKSHOP_COPY} from "@/data/workshop-copy";
import {HomeSectionHeading,HomeTextLink} from "./HomeShared";
import {WorkshopCard} from "@/components/workshops/WorkshopCard";
/** The Home preview disappears entirely when no published upcoming workshops exist. */
export function HomeWorkshops({locale,workshops}:{locale:Locale;workshops:PublicWorkshop[]}){
  if(!workshops.length)return null;
  const c=WORKSHOP_COPY[locale];
  return <section className="home-section home-section-cream home-workshops"><div className="home-shell">
    <div className="home-workshop-heading"><div><HomeSectionHeading eyebrow={c.homeEyebrow} title={c.homeTitle}/></div>
      <HomeTextLink href={`/workshops/${locale}`}>{c.homeCta}</HomeTextLink></div>
    <div className="home-workshop-grid">{workshops.slice(0,3).map(item=><WorkshopCard key={item.id} item={item} locale={locale}/>)}</div>
  </div></section>;
}
