import type {Locale} from "@/types";
import type {PublicSiteSettings} from "@/types/site-settings";
import {contactPresentation} from "@/lib/contact-settings";
import {externalLinkLabel} from "@/lib/site-links";

/** Shared public contact contract with component-specific editorial markup. */
export function ContactLinks({locale,settings,showSocials=true}:{locale:Locale;settings:PublicSiteSettings|null;showSocials?:boolean}){
  const {email,phone,phoneHref,facebook,youtube}=contactPresentation(settings);
  return <address className="home-contact-links">
    <div className="home-contact-methods">
      {email&&<a className="home-contact-method" href={`mailto:${email}`}><span>Email</span><strong>{email}</strong></a>}
      {phone&&<a className="home-contact-method" href={phoneHref}><span>{locale==="vi"?"Điện thoại":"Phone"}</span><strong>{phone}</strong></a>}
    </div>
    {showSocials&&(facebook||youtube)&&<nav className="home-social-links" aria-label={locale==="vi"?"Mạng xã hội":"Social media"}>
      {facebook&&<a href={facebook} target="_blank" rel="noopener noreferrer" aria-label={externalLinkLabel("Facebook",locale)}>Facebook <span aria-hidden="true">↗</span></a>}
      {youtube&&<a href={youtube} target="_blank" rel="noopener noreferrer" aria-label={externalLinkLabel("YouTube",locale)}>YouTube <span aria-hidden="true">↗</span></a>}
    </nav>}
  </address>;
}
