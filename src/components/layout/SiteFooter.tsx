"use client";

import {BrandLogo} from "@/components/brand/BrandLogo";
import {FOOTER_CONTACT,FOOTER_COPY,FOOTER_LINKS,resolveFooterLink} from "@/data/footer-navigation";
import {useNFV} from "@/state/NFVContext";

/** Keeps the brand/footer sections together in one content grid, themed with shared design tokens. */
export function SiteFooter(){
  const {ui}=useNFV();
  const copy=FOOTER_COPY[ui.locale];
  return <footer className="nfv-site-footer">
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
            <div><dt>{copy.emailLabel}</dt><dd><a href={`mailto:${FOOTER_CONTACT.email}`}>{FOOTER_CONTACT.email}</a></dd></div>
            <div><dt>{copy.phoneLabel}</dt><dd><a href={`tel:${FOOTER_CONTACT.phoneHref}`}>{FOOTER_CONTACT.phone}</a></dd></div>
          </dl>
          <p>{copy.contactNote}</p>
        </section>
        <nav className="nfv-site-footer__nav" aria-label={ui.locale==="vi"?"Liên kết cuối trang":"Footer navigation"}>
          {FOOTER_LINKS.map(link=>{
            const item=resolveFooterLink(link,ui.locale);
            return <a key={item.id} href={item.href} target={item.external?"_blank":undefined}
              rel={item.external?"noopener noreferrer":undefined}>{item.label}{item.external&&<span aria-hidden="true"> ↗</span>}</a>;
          })}
        </nav>
      </div>
      <div className="nfv-site-footer__bottom">
        <span>© {new Date().getFullYear()} Natural Farming Vietnam. {copy.legal}</span>
        <span>{copy.closing}</span>
      </div>
    </div>
  </footer>;
}
