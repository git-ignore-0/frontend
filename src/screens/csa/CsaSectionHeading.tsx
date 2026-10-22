/** Shared CSA section heading; page-wide size and spacing live in 13-csa.css. */
export function CsaSectionHeading({id,title,intro,eyebrow,center=false}:{id:string;title:string;intro?:string;eyebrow?:string;center?:boolean}){
  return <header className={`csa-v2-section-heading${center?" csa-v2-center":""}`}>
    {eyebrow&&<p className="csa-v2-kicker">{eyebrow}</p>}
    <h2 id={id}>{title}</h2>{intro&&<p>{intro}</p>}
  </header>;
}
