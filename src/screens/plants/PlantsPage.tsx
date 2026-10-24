"use client";
import {PageHero} from "@/components/editorial/PageHero";
import {KnowledgeLayout,KnowledgeSection} from "@/components/knowledge/KnowledgeLayout";
import {KnowledgePhoto,KnowledgeTable,LegacyFigure} from "@/components/knowledge/KnowledgeContent";
import {PLANTS_COPY,PLANT_INPUTS} from "@/data/knowledge-content";
import {useNFV} from "@/state/NFVContext";

const ids=["context","systems","soil","cycle","inputs","practice"] as const;
/** The sole Plants screen; all editorial sections are under the scoped knowledge theme. */
export function PlantsPage(){
  const {ui}=useNFV();
  const locale=ui.locale;
  const c=PLANTS_COPY[locale];
  const toc=ids.map((id,i)=>({id,label:c.toc[i]}));
  return <main id="main-content" className="nfv-editorial nfv-knowledge" aria-label={c.label}>
    <PageHero eyebrow={c.label} title={c.title} intro={c.intro} image="green-beans.webp" alt={c.alt} position="center 48%"/>
    <KnowledgeLayout locale={locale} toc={toc}>
      <KnowledgeSection id={ids[0]} index={c.sections[0].index} title={c.sections[0].title}><div className="knowledge-prose"><p>{c.paragraphs[0]}</p><p>{c.paragraphs[1]}</p></div></KnowledgeSection>
      <KnowledgeSection id={ids[1]} index={c.sections[1].index} title={c.sections[1].title}><KnowledgeTable label={locale==="vi"?"So sánh các hệ thống canh tác":"Comparison of farming systems"}
        headers={c.comparisonHeaders!} rows={c.comparisonRows!}/></KnowledgeSection>
      <KnowledgeSection id={ids[2]} index={c.sections[2].index} title={c.sections[2].title}><div className="knowledge-media-prose">
        <KnowledgePhoto file="microscope.webp" alt={c.figureAlt[0]} caption={c.figureCaption?.[0]}/>
        <div className="knowledge-prose"><p>{c.paragraphs[2]}</p><p>{c.paragraphs[3]}</p></div>
      </div></KnowledgeSection>
      <KnowledgeSection id={ids[3]} index={c.sections[3].index} title={c.sections[3].title}><p>{c.paragraphs[4]}</p>
        <LegacyFigure file="legacy/potato-cycle.png" locale={locale} alt={c.figureAlt[1]}/>
      </KnowledgeSection>
      <KnowledgeSection id={ids[4]} index={c.sections[4].index} title={c.sections[4].title}><p>{c.paragraphs[5]}</p><div className="knowledge-inputs">
        {PLANT_INPUTS.map(item=><details key={item.code}>
          <summary><strong>{item.code}</strong><span>{item[locale][0]}</span><i aria-hidden="true">+</i></summary>
          <p>{item[locale][1]}</p>
        </details>)}
      </div></KnowledgeSection>
      <KnowledgeSection id={ids[5]} index={c.sections[5].index} title={c.sections[5].title}><div className="knowledge-prose"><p>{c.paragraphs[6]}</p><p>{c.paragraphs[7]}</p></div>
        <a className="knowledge-text-link" href={`/about/${locale}`}>{c.cta}<span aria-hidden="true">↗</span></a>
      </KnowledgeSection>
    </KnowledgeLayout>
  </main>;
}
