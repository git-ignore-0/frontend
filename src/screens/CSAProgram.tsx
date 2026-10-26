"use client";
import {useEffect,useRef,useState} from "react";
import {ActionLink,Button,Icon} from "@/components/UI";
import {CSA_COPY} from "@/data/csa-content";
import {siteImageSrc} from "@/lib/site-assets";
import {useSiteSettings} from "@/hooks/useSiteSettings";
import {useNFV} from "@/state/NFVContext";
import {CsaComparison} from "./csa/CsaComparison";
import {CsaPackages} from "./csa/CsaPackages";
import {CsaFaq} from "./csa/CsaFaq";
import {CsaSectionHeading} from "./csa/CsaSectionHeading";

/** Ported from frontendv2 CSA; the V62 shell owns Header, Footer and navigation. */
export function CSAProgram(){
  const {ui,navigate}=useNFV();const locale=ui.locale;const copy=CSA_COPY[locale];
  const settings=useSiteSettings(locale);
  const rawFarmsUrl=settings?.links?.find(item=>item.kind==="farms")?.url;
  const farmsUrl=rawFarmsUrl&&/^https?:\/\//i.test(rawFarmsUrl)?rawFarmsUrl:undefined;
  const buyRef=useRef<HTMLDivElement>(null);
  const [showFloating,setShowFloating]=useState(false);
  useEffect(()=>{setShowFloating(false);const target=buyRef.current;if(!target||typeof IntersectionObserver==="undefined")return;const observer=new IntersectionObserver(([entry])=>setShowFloating(!entry.isIntersecting),{threshold:0});observer.observe(target);return()=>observer.disconnect();},[locale]);
  const openCsaPurchase=()=>navigate("account",{tab:"csa",hub:false});
  return <main id="main-content" className="nfv-csa">
    <div className="csa-v2-shell">
      <header className="csa-v2-hero"><div className="csa-v2-hero-copy"><p className="csa-v2-kicker">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="csa-v2-lead">{copy.intro}</p><ul className="csa-v2-benefits">{copy.benefits.map(benefit=><li key={benefit.label}><Icon name={benefit.icon} size={17}/>{benefit.label}</li>)}</ul><div ref={buyRef} className="csa-v2-hero-actions"><Button onClick={openCsaPurchase}>{copy.buyNow}</Button></div></div><div className="csa-v2-hero-media"><img src={siteImageSrc("csa-seedlings.webp")} alt={copy.heroAlt} decoding="async" fetchPriority="high"/></div></header>
      {copy.comparisons.map(item=><CsaComparison key={item.id} copy={item} farmsUrl={farmsUrl}/>)}
      <CsaPackages locale={locale} copy={copy}/>
      <section className="csa-v2-timeline" aria-labelledby="csa-timeline-title"><CsaSectionHeading id="csa-timeline-title" title={copy.timelineTitle} intro={copy.timelineIntro}/><ol className="csa-v2-timeline-list" aria-label={copy.timelineLabel}>{copy.timeline.map(step=><li className="csa-v2-timeline-item" key={step.day}><div className="csa-v2-timeline-photo"><img src={siteImageSrc(step.image)} alt={step.alt} loading="lazy" decoding="async"/></div><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol></section>
      <CsaFaq copy={copy}/>
      <section className="csa-v2-help" aria-labelledby="csa-help-title"><div className="csa-v2-help-copy"><h2 id="csa-help-title">{copy.zaloTitle}</h2><p>{copy.zaloBody}</p></div><ActionLink className="csa-v2-help-action" href={copy.zaloUrl}><Icon name="message" size={17}/>{copy.zaloCta}</ActionLink></section>
    </div>
    {showFloating&&<aside className="csa-v2-floating"><Button onClick={openCsaPurchase}><Icon name="bag" size={17}/>{copy.buyNow}</Button></aside>}
  </main>;
}
