"use client";
import {ABOUT_COPY} from "@/data/about-content";
import {useNFV} from "@/state/NFVContext";
import {PageHero} from "@/components/editorial/PageHero";
import {EditorialPhoto} from "@/components/editorial/EditorialPhoto";
import {ContactLinks} from "@/components/editorial/ContactLinks";
import {useSiteSettings} from "@/hooks/useSiteSettings";
/** About is a single public screen. Header and Footer remain owned by the app shell. */
export function AboutPage(){
  const {ui}=useNFV();
  const c=ABOUT_COPY[ui.locale];
  const settings=useSiteSettings(ui.locale);
  return <main id="main-content" className="nfv-editorial">
    <PageHero eyebrow={c.heroEyebrow} title={c.title} intro={c.intro} image="people-on-soil.webp" alt={c.heroAlt} position="center 44%"/>
    <section className="editorial-section editorial-about-mission"><div className="editorial-shell editorial-split">
      <div><p className="editorial-eyebrow">{c.purposeEyebrow}</p><h2 className="editorial-section-heading">{c.mission}</h2></div>
      <div><div className="editorial-prose editorial-mission-copy">{c.body.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</div>
        <div className="editorial-field-photo-row" aria-hidden="true">
          <div className="editorial-field-photo small"><EditorialPhoto file="harvest-leaves.webp"/></div>
          <div className="editorial-field-photo wide"><EditorialPhoto file="farm-landscape.webp"/></div>
        </div>
      </div>
    </div></section>
    <section className="editorial-section editorial-section-cream"><div className="editorial-shell">
      <p className="editorial-eyebrow">{c.valuesEyebrow}</p><h2 className="editorial-section-heading">{c.values}</h2>
      <div className="editorial-value-grid">{c.cards.map(([title,body],index)=><article key={title}><span>0{index+1}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
    </div></section>
    <section className="editorial-section"><div className="editorial-shell editorial-split">
      <div className="editorial-about-image"><EditorialPhoto file="farmer-field.webp" alt={c.gardenAlt} position="center 38%"/></div>
      <div className="editorial-closing-panel"><p className="editorial-eyebrow">{c.storyEyebrow}</p>
        <h2 className="editorial-section-heading">{c.truth}</h2><p className="editorial-lede">{c.truthBody}</p>
        <ContactLinks locale={ui.locale} settings={settings} showSocials={false}/>
      </div>
    </div></section>
  </main>;
}
