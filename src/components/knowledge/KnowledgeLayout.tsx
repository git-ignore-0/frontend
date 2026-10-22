import type {ReactNode} from "react";
import type {Locale} from "@/types";

/** Shared anchored table of contents and article layout for the two knowledge pages. */
export function KnowledgeLayout({locale,toc,children}:{locale:Locale;toc:readonly {id:string;label:string}[];children:ReactNode}){
  return <div className="knowledge-shell knowledge-layout">
    <aside className="knowledge-toc" aria-label={locale==="vi"?"Mục lục":"On this page"}>
      <p>{locale==="vi"?"Trên trang này":"On this page"}</p>
      <nav>{toc.map(item=><a key={item.id} href={`#${item.id}`}>{item.label}</a>)}</nav>
    </aside>
    <article className="knowledge-body">{children}</article>
  </div>;
}

export function KnowledgeSection({id,index,title,children}:{id:string;index:string;title:string;children:ReactNode}){
  return <section id={id} className="knowledge-section">
    <p className="knowledge-eyebrow">{index}</p><h2>{title}</h2>{children}
  </section>;
}
