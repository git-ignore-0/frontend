import {EditorialPhoto} from "@/components/editorial/EditorialPhoto";
import type {Locale} from "@/types";

/** Keyboard-scrollable tables: prevents narrow screens from widening the viewport. */
export function KnowledgeTable({label,headers,rows}:{label:string;headers:readonly string[];rows:readonly (readonly string[])[]}){
  return <div className="knowledge-table-wrap" role="region" aria-label={label} tabIndex={0}>
    <table><thead><tr>{headers.map((h,i)=><th scope="col" key={i}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=>j===0?<th scope="row" key={j}>{cell}</th>:<td key={j}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}

export function KnowledgePhoto({file,alt="",caption,variant=""}:{file:string;alt?:string;caption?:string;variant?:""|"portrait"|"wide-reference"}){
  return <figure className={`knowledge-feature-figure ${variant}`}><EditorialPhoto file={file} alt={alt}/>{caption&&<figcaption>{caption}</figcaption>}</figure>;
}

export function LegacyFigure({file,locale,alt,caption}:{file:string;locale:Locale;alt:string;caption?:string}){
  return <figure className="knowledge-legacy-figure"><span>{locale==="vi"?"Tư liệu tham khảo cũ":"Legacy reference"}</span><EditorialPhoto file={file} alt={alt}/>{caption&&<figcaption>{caption}</figcaption>}</figure>;
}

export function KnowledgeCards({cards}:{cards:readonly (readonly [string,string,string])[]}){
  return <div className="knowledge-cards">{cards.map(([number,title,description])=><article className="knowledge-card" key={number}>
    <p className="knowledge-eyebrow">{number}</p><h3>{title}</h3><p>{description}</p>
  </article>)}</div>;
}
