import type {MouseEventHandler,ReactNode} from "react";
import {sitePageHref} from "@/lib/site-links";
import {EditorialPhoto} from "@/components/editorial/EditorialPhoto";

/** Use the same media primitive as About; original Home CSS still controls its presentation. */
export function HomeImage({file,alt="",priority=false}:{file:string;alt?:string;priority?:boolean}){
  return <EditorialPhoto file={file} alt={alt} priority={priority}/>;
}

/** Shared visual CTA; no dependency on the store's smaller .btn or global .text-link. */
export function HomeTextLink({href,children,onClick}:{href:string;children:ReactNode;onClick?:MouseEventHandler<HTMLAnchorElement>}){
  return <a className="home-text-link" href={href} onClick={onClick}>{children}<span aria-hidden="true" className="home-arrow">→</span></a>;
}
export function HomeSectionHeading({eyebrow,title}:{eyebrow:string;title:string}){
  return <><p className="home-eyebrow">{eyebrow}</p><h2 className="home-section-heading">{title}</h2></>;
}
export {sitePageHref};
