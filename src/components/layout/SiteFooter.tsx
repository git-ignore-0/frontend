"use client";

import {BrandLogo} from "@/components/brand/BrandLogo";
import {FOOTER_COPY,footerNavigationLinks,resolveFooterLink} from "@/data/footer-navigation";
import {useSiteSettings} from "@/hooks/useSiteSettings";
import {contactPresentation} from "@/lib/contact-settings";
import {externalLinkLabel} from "@/lib/site-links";
import {organizationJsonLd,serializeJsonLd} from "@/lib/organization-json-ld";
import {useNFV} from "@/state/NFVContext";

/** Keeps the brand/footer sections together in one content grid, themed with shared design tokens. */
export function SiteFooter(){
  const {ui}=useNFV();
  const copy=FOOTER_COPY[ui.locale];
  const settings=useSiteSettings(ui.locale);
  const {email,phone,phoneHref,facebook,youtube}=contactPresentation(settings);
  return <><footer className="nfv-site-footer">
    <div className="container nfv-site-footer__inner">
      <div className="nfv-site-footer__main">
        <section className="nfv-site-footer__about" aria-label="Natural Farming Vietnam">
          <div className="nfv-site-footer__identity">
            <BrandLogo locale={ui.locale} variant="footer"/>
            <strong>Natural Farming Vietnam</strong>
          </div>
          <p>{copy.description}</p>
        </section>
        <section className="nfv-site-footer__contact">
          <h2>{copy.contactTitle}</h2>
          <dl>
            {email&&<div><dt>{copy.emailLabel}</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div>}
            {phone&&<div><dt>{copy.phoneLabel}</dt><dd><a href={phoneHref}>{phone}</a></dd></div>}
          </dl>
          {(facebook||youtube)&&<nav className="nfv-site-footer__socials" aria-label={ui.locale==="vi"?"Mạng xã hội":"Social media"}>
            {facebook&&<a href={facebook} target="_blank" rel="noopener noreferrer" aria-label={externalLinkLabel("Facebook",ui.locale)}>Facebook <span aria-hidden="true">↗</span></a>}
            {youtube&&<a href={youtube} target="_blank" rel="noopener noreferrer" aria-label={externalLinkLabel("YouTube",ui.locale)}>YouTube <span aria-hidden="true">↗</span></a>}
          </nav>}
          <p>{copy.contactNote}</p>
        </section>
        <nav className="nfv-site-footer__nav" aria-label={ui.locale==="vi"?"Liên kết cuối trang":"Footer navigation"}>
          {footerNavigationLinks(settings).map(link=>{
            const item=resolveFooterLink(link,ui.locale,settings);
            return <a key={item.id} href={item.href} target={item.external?"_blank":undefined}
              aria-label={item.external?externalLinkLabel(item.label,ui.locale):undefined}
              rel={item.external?"noopener noreferrer":undefined}>{item.label}{item.external&&<span aria-hidden="true"> ↗</span>}</a>;
          })}
        </nav>
      </div>
      <div className="nfv-site-footer__bottom">
        <span>© {new Date().getFullYear()} Natural Farming Vietnam. {copy.legal}</span>
        <span>{copy.closing}</span>
      </div>
    </div>
  </footer><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(organizationJsonLd(settings))}}/></>;
}
