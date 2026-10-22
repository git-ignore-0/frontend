import type {Locale} from "@/types";
import type {PublicSiteSettings} from "@/types/site-settings";
import {FOOTER_CONTACT} from "@/data/footer-navigation";

/** Reproduces the site's ContactLinks structure, without changing the global Footer. */
const fallback={
  email:FOOTER_CONTACT.email,phone:FOOTER_CONTACT.phone,
  facebook:"https://www.facebook.com/naturalfarmingvn/",
  youtube:"https://www.youtube.com/@naturalfarmingvietnam"
};
export function ContactLinks({locale,settings,showSocials=true}:{locale:Locale;settings:PublicSiteSettings|null;showSocials?:boolean}){
  const email=settings?(settings.is_email_enabled?settings.email:""):fallback.email;
  const phone=settings?(settings.is_phone_enabled?settings.phone_display:""):fallback.phone;
  const tel=phone.replace(/[^+\d]/g,"");
  const social=(kind:string)=>settings?settings.links?.find(link=>link.kind===kind)?.url:fallback[kind as "facebook"|"youtube"];
  const facebook=social("facebook"), youtube=social("youtube");
  return <address className="home-contact-links">
    <div className="home-contact-methods">
      {email&&<a className="home-contact-method" href={`mailto:${email}`}><span>Email</span><strong>{email}</strong></a>}
      {phone&&tel&&<a className="home-contact-method" href={`tel:${tel}`}><span>{locale==="vi"?"Điện thoại":"Phone"}</span><strong>{phone}</strong></a>}
    </div>
    {showSocials&&(facebook||youtube)&&<nav className="home-social-links" aria-label={locale==="vi"?"Mạng xã hội":"Social media"}>
      {facebook&&<a href={facebook} target="_blank" rel="noopener noreferrer">Facebook <span aria-hidden="true">↗</span></a>}
      {youtube&&<a href={youtube} target="_blank" rel="noopener noreferrer">YouTube <span aria-hidden="true">↗</span></a>}
    </nav>}
  </address>;
}
