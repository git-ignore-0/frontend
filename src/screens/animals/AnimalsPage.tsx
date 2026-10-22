"use client";
import {PageHero} from "@/components/editorial/PageHero";
import {KnowledgeLayout,KnowledgeSection} from "@/components/knowledge/KnowledgeLayout";
import {KnowledgeCards,KnowledgePhoto,KnowledgeTable,LegacyFigure} from "@/components/knowledge/KnowledgeContent";
import {ANIMALS_COPY} from "@/data/knowledge-content";
import {useNFV} from "@/state/NFVContext";

const ids=["philosophy","housing","bedding","pigs","chickens","health"] as const;
/** The sole Animals screen, sharing the knowledge framework with Plants. */
export function AnimalsPage(){
  const {ui}=useNFV();
  const locale=ui.locale;
  const c=ANIMALS_COPY[locale];
  const toc=ids.map((id,i)=>({id,label:c.toc[i]}));
  return <main id="main-content" className="nfv-editorial nfv-knowledge" aria-label={c.label}>
    <PageHero eyebrow={c.label} title={c.title} intro={c.intro} image="piglets-straw.webp" alt={c.alt} position="center 42%"/>
    <KnowledgeLayout locale={locale} toc={toc}>
      <KnowledgeSection id={ids[0]} index={c.sections[0].index} title={c.sections[0].title}><div className="knowledge-prose"><p>{c.paragraphs[0]}</p><p>{c.paragraphs[1]}</p></div>
        <KnowledgeCards cards={c.cards!}/></KnowledgeSection>
      <KnowledgeSection id={ids[1]} index={c.sections[1].index} title={c.sections[1].title}><p>{c.paragraphs[2]}</p>
        <KnowledgePhoto file="chicken-house.webp" variant="wide-reference"/>
        <LegacyFigure locale={locale} file="legacy/pig-house-design.png" alt={c.figureAlt[0]}/>
        <ul>{c.bulletGroups![0].map(text=><li key={text}>{text}</li>)}</ul>
        <LegacyFigure locale={locale} file="legacy/sample-pig-house.png" alt={c.figureAlt[1]}/>
      </KnowledgeSection>
      <KnowledgeSection id={ids[2]} index={c.sections[2].index} title={c.sections[2].title}><div className="knowledge-prose"><p>{c.paragraphs[3]}</p><p>{c.paragraphs[4]}</p></div>
        <KnowledgeTable label={locale==="vi"?"Tín hiệu quản lý nền sâu":"Deep bedding management signals"} headers={c.beddingHeaders!} rows={c.beddingRows!}/>
      </KnowledgeSection>
      <KnowledgeSection id={ids[3]} index={c.sections[3].index} title={c.sections[3].title}><p>{c.paragraphs[5]}</p><div className="knowledge-media-prose">
        <LegacyFigure locale={locale} file="legacy/feed-process.png" alt={c.figureAlt[2]} caption={c.figureCaption?.[2]}/>
        <div><h3>{c.notes![0]}</h3><ol>{c.stageItems!.map(stage=><li key={stage}>{stage}</li>)}</ol></div>
      </div><h3>{c.notes![1]}</h3><p>{c.paragraphs[6]}</p></KnowledgeSection>
      <KnowledgeSection id={ids[4]} index={c.sections[4].index} title={c.sections[4].title}><div className="knowledge-media-prose">
        <KnowledgePhoto file="chickens.webp" alt={c.figureAlt[3]} variant="portrait"/>
        <div className="knowledge-prose"><p>{c.paragraphs[7]}</p><p>{c.paragraphs[8]}</p></div>
      </div>
        <LegacyFigure locale={locale} file="legacy/brooder-crib.jpg" alt={c.figureAlt[4]}/>
        <KnowledgeTable label={locale==="vi"?"Tổng quan hệ nuôi gà Natural Farming":"Natural Farming chicken system overview"} headers={c.chickenHeaders!} rows={c.chickenRows!}/>
      </KnowledgeSection>
      <KnowledgeSection id={ids[5]} index={c.sections[5].index} title={c.sections[5].title}><div className="knowledge-safety-panel"><h3>{c.notes![2]}</h3><p>{c.paragraphs[9]}</p></div>
        <ul>{c.bulletGroups![1].map(text=><li key={text}>{text}</li>)}</ul>
      </KnowledgeSection>
    </KnowledgeLayout>
  </main>;
}
