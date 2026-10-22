"use client";
import {useState,type KeyboardEvent} from "react";
import {ActionLink,Button} from "@/components/UI";
import type {ComparisonCopy} from "@/data/csa-content";
import {useNFV} from "@/state/NFVContext";
import {CsaSectionHeading} from "./CsaSectionHeading";

function ComparisonColumn({column,positive,active,labelId,panelId}:{column:ComparisonCopy["left"];positive:boolean;active:boolean;labelId:string;panelId:string}){
  return <div className={`csa-v2-column ${positive?"is-right":"is-left"}`} id={panelId} role="tabpanel" aria-labelledby={labelId} tabIndex={active?0:-1}>
    <h3>{column.label}</h3><ul>{column.items.map(item=><li key={item}><span className="csa-v2-mark" aria-hidden="true">{positive?"✓":"×"}</span><span>{item}</span></li>)}</ul>
  </div>;
}
function Quote({text,term}:{text:string;term:string}){
  const index=text.indexOf(term);
  return <blockquote className="csa-v2-quote"><span className="csa-v2-quote-mark" aria-hidden="true">“</span><p>{index<0?text:<>{text.slice(0,index)}<span className="csa-v2-quote-term">{term}</span>{text.slice(index+term.length)}</>}</p></blockquote>;
}
export function CsaComparison({copy,farmsUrl}:{copy:ComparisonCopy;farmsUrl?:string}){
  const {navigate}=useNFV();
  const [active,setActive]=useState<"left"|"right">("left");
  const id=`csa-comparison-${copy.id}`;
  const tabs=["left","right"] as const;
  function onTabKey(event:KeyboardEvent<HTMLButtonElement>,key:"left"|"right"){
    const to=event.key==="Home"?"left":event.key==="End"?"right":event.key==="ArrowLeft"?(key==="left"?"right":"left"):event.key==="ArrowRight"?(key==="right"?"left":"right"):null;
    if(!to||to===key)return;
    event.preventDefault();setActive(to);document.getElementById(`${id}-tab-${to}`)?.focus();
  }
  return <section className="csa-v2-comparison" aria-labelledby={id}>
    <CsaSectionHeading id={id} title={copy.title} intro={copy.intro} eyebrow={copy.eyebrow} center/>
    <div className="csa-v2-comparison-tabs" role="tablist" aria-label={copy.title}>{tabs.map(tab=><Button key={tab} variant="plain" className={active===tab?"is-active":""} role="tab" id={`${id}-tab-${tab}`} aria-controls={`${id}-panel-${tab}`} aria-selected={active===tab} tabIndex={active===tab?0:-1} onKeyDown={e=>onTabKey(e,tab)} onClick={()=>setActive(tab)}>{copy[tab].label}</Button>)}</div>
    <div className={`csa-v2-comparison-grid active-${active}`}>
      <ComparisonColumn column={copy.left} labelId={`${id}-tab-left`} panelId={`${id}-panel-left`} active={active==="left"} positive={false}/>
      <div className="csa-v2-versus" aria-hidden="true"><span>{copy.versus}</span></div>
      <ComparisonColumn column={copy.right} labelId={`${id}-tab-right`} panelId={`${id}-panel-right`} active={active==="right"} positive/>
    </div>
    <div className="csa-v2-conclusion"><p>{copy.conclusion.lead}</p><strong>{copy.conclusion.accent}</strong>
      {copy.conclusion.actions&&<div className="csa-v2-conclusion-actions">
        {copy.conclusion.actions.map(action=>{
          const variant=action.variant==="ghost"?"outline":"primary";
          if(action.kind==="farms")return farmsUrl?<ActionLink key={action.label} href={farmsUrl} variant={variant} target="_blank" rel="noopener noreferrer">{action.label}</ActionLink>:null;
          return <Button key={action.label} variant={variant} onClick={()=>navigate("tracker")}>{action.label}</Button>;
        })}
      </div>}
    </div>
    {copy.quote&&<Quote {...copy.quote}/>}
  </section>;
}
