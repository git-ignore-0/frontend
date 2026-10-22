import {HomeImage,HomeTextLink} from "./HomeShared";

export function HomeStoryCard({image,label,title,body,cta,href,tall=false}:{
  image:string;label:string;title:string;body:string;cta:string;href:string;tall?:boolean;
}){
  return <article className="home-story-card">
    <div className={`home-story-image${tall?" is-tall":""}`}><HomeImage file={image}/></div>
    <p className="home-eyebrow">{label}</p><h3>{title}</h3><p>{body}</p>
    <HomeTextLink href={href}>{cta}</HomeTextLink>
  </article>;
}
