"use client";
import {HOME_COPY} from "@/data/home-content";
import {useNFV} from "@/state/NFVContext";
import {HomeImage,HomeSectionHeading,HomeTextLink,sitePageHref} from "./HomeShared";
import {HomeStoryCard} from "./HomeStoryCard";
import {HomeWorkshops} from "./HomeWorkshops";
import {ContactLinks} from "@/components/editorial/ContactLinks";
import {useHomeContent} from "./useHomeContent";

/** Single Home screen. Layout shell owns Header/Footer; Home styles are scoped. */
export function HomePage(){
  const {ui,navigate}=useNFV();
  const {locale}=ui;
  const c=HOME_COPY[locale];
  const {workshops,settings}=useHomeContent(locale);
  const stories=[
    {image:"harvest.webp",label:c.plantLabel,title:c.plantTitle,body:c.plantBody,cta:c.plantCta,href:sitePageHref(locale,"plants")},
    {image:"piglets.webp",label:c.animalLabel,title:c.animalTitle,body:c.animalBody,cta:c.animalCta,href:sitePageHref(locale,"animals"),tall:true},
    {image:"family-field.webp",label:c.communityLabel,title:c.peopleTitle,body:c.peopleBody,cta:c.peopleCta,href:`/about/${locale}`}
  ];
  return <main className="nfv-home" id="main-content">
    <section className="home-hero">
      <div className="home-hero-media"><HomeImage file="farm-aerial.webp" alt={c.heroAlt} priority/></div>
      <div className="home-hero-shade"/>
      <div className="home-shell home-hero-copy">
        <p className="home-eyebrow">{c.heroEyebrow}</p><h1>{c.title}</h1><p>{c.intro}</p>
        <div className="home-hero-actions"><HomeTextLink href={`/about/${locale}`}>{c.primary}</HomeTextLink><HomeTextLink href={sitePageHref(locale,"plants")}>{c.secondary}</HomeTextLink></div>
      </div>
    </section>
    <section className="home-section home-section-cream">
      <div className="home-shell home-split"><div><HomeSectionHeading eyebrow={c.systemsEyebrow} title={c.what}/></div>
        <div><p className="home-lede">{c.whatBody}</p><div className="home-principles">
          {c.principles.map(([title,body],i)=><div className="home-principle" key={title}><strong>0{i+1}</strong><div><h3>{title}</h3><p>{body}</p></div></div>)}
        </div></div>
      </div>
    </section>
    <section className="home-section"><div className="home-shell">
      <HomeSectionHeading eyebrow={c.pillarsEyebrow} title={c.pillars}/>
      <div className="home-story-grid">{stories.map(story=><HomeStoryCard key={story.image} {...story}/>)}</div>
    </div></section>
    <HomeWorkshops locale={locale} workshops={workshops}/>
    <section className="home-section home-section-forest"><div className="home-shell home-split">
      <div><HomeSectionHeading eyebrow={c.storeEyebrow} title={c.storeTitle}/></div>
      <div><p className="home-lede home-store-lede">{c.storeBody}</p>
        <HomeTextLink href={`/store/${locale}`} onClick={event=>{if(event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();navigate("store");}}}>{c.storeCta}</HomeTextLink>
      </div>
    </div></section>
    <section className="home-section home-contact-band"><div className="home-shell home-split">
      <div className="home-contact-image"><HomeImage file="microscope.webp"/></div>
      <div><HomeSectionHeading eyebrow={c.contactEyebrow} title={c.contactTitle}/>
        <p className="home-lede">{c.contactBody}</p>
        <ContactLinks locale={locale} settings={settings}/>
      </div>
    </div></section>
  </main>;
}
