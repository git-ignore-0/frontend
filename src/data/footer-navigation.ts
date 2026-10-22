import type {Locale} from "@/types";
import {MAIN_NAV_ITEMS,resolveMainNavHref,type MainNavId} from "@/data/main-navigation";
import {SITE_ORIGIN} from "@/config/site-brand";
import {isLocalPublicPage} from "@/lib/site-links";

type LocaleText = Record<Locale,string>;
type SharedNavLink = {id: Exclude<MainNavId,"account">};
type FooterOnlyLink = {id: "plants"|"animals"|"testimonials"|"privacy"|"terms"; label: LocaleText; path:string};
export type FooterLink = SharedNavLink | FooterOnlyLink;

/** the site's footer order. Links that are also in the header reuse the same nav data. */
export const FOOTER_LINKS: readonly FooterLink[] = [
  {id:"about"},
  {id:"plants",label:{vi:"Cây trồng",en:"Plants"},path:"/plants/{locale}"},
  {id:"animals",label:{vi:"Vật nuôi",en:"Animals"},path:"/animals/{locale}"},
  {id:"workshops"},
  {id:"testimonials",label:{vi:"Lời chứng",en:"Stories"},path:"/testimonials/{locale}"},
  {id:"csa"},
  {id:"privacy",label:{vi:"Chính sách quyền riêng tư",en:"Privacy Policy"},path:"/privacy-policy/{locale}"},
  {id:"terms",label:{vi:"Điều khoản & Điều kiện",en:"Terms & Conditions"},path:"/term-conditions/{locale}"},
  {id:"store"},
  {id:"forum"}
];

/** Shared link resolution keeps the footer and main menu in sync. */
export function resolveFooterLink(link:FooterLink,locale:Locale){
  if ("path" in link) return {
    id:link.id, label:link.label[locale],
    href:isLocalPublicPage(link.id) ? link.path.replace("{locale}",locale) : `${SITE_ORIGIN}${link.path.replace("{locale}",locale)}`,external:false
  };
  const shared=MAIN_NAV_ITEMS.find(item=>item.id===link.id);
  if(!shared) throw new Error(`Unknown main navigation id: ${link.id}`);
  return {
    id:shared.id,label:shared.label[locale],
    href:resolveMainNavHref(shared,locale),
    external:!!shared.external
  };
}

export const FOOTER_COPY:Record<Locale,{
  description:string; contactTitle:string; emailLabel:string; phoneLabel:string;
  contactNote:string; legal:string; closing:string;
}> = {
  vi:{
    description:"Ngôi nhà kiến thức sống dành cho đất, cây trồng, vật nuôi và cộng đồng nông nghiệp Việt Nam.",
    contactTitle:"Kết nối", emailLabel:"Email", phoneLabel:"Điện thoại",
    contactNote:"Dành cho trao đổi học tập, hợp tác và câu chuyện nông trại.",
    legal:"Kiến thức lớn lên từ quan sát.", closing:"Đất sống · Từ đất, sự sống bắt đầu"
  },
  en:{
    description:"A living knowledge home for soil, plants, animals and farming communities in Vietnam.",
    contactTitle:"Connect", emailLabel:"Email", phoneLabel:"Phone",
    contactNote:"For learning, collaboration and farm conversations.",
    legal:"Knowledge grows through observation.", closing:"Living Soil · From soil, life begins"
  }
};

export const FOOTER_CONTACT = {
  email:"khanh@naturalfarmingvietnam.com", phone:"+84 988.158.285", phoneHref:"+84988158285"
} as const;
