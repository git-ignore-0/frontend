import {EditorialPhoto} from "./EditorialPhoto";
/** Site-style introduction shared by editorial pages; scoped styles are owned by .nfv-editorial. */
export function PageHero({eyebrow,title,intro,image,alt,position}:{eyebrow:string;title:string;intro:string;image:string;alt:string;position?:string}){
  return <section className="editorial-page-hero"><div className="editorial-shell editorial-page-hero-grid">
    <div className="editorial-page-hero-copy"><p className="editorial-eyebrow">{eyebrow}</p><h1>{title}</h1><p className="editorial-lede">{intro}</p></div>
    <div className="editorial-page-hero-image"><EditorialPhoto file={image} alt={alt} position={position} priority/></div>
  </div></section>;
}
