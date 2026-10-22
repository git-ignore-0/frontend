"use client";
import {useState} from "react";
import {Button,Icon} from "@/components/UI";
import type {CsaCopy} from "@/data/csa-content";
export function CsaFaq({copy}:{copy:CsaCopy}){
  const [open,setOpen]=useState<number|null>(0);
  return <section className="csa-v2-faq" aria-labelledby="csa-faq-title"><h2 id="csa-faq-title">{copy.faqTitle}</h2><div className="csa-v2-faq-list">{copy.faqItems.map((item,index)=>{const active=open===index;return <div className="csa-v2-faq-item" key={item.question}>
    <Button variant="plain" className="csa-v2-faq-trigger" aria-expanded={active} aria-controls={`csa-faq-panel-${index}`} id={`csa-faq-trigger-${index}`} onClick={()=>setOpen(current=>current===index?null:index)}>{item.question}<span className={`csa-v2-faq-chevron ${active?"is-open":""}`}><Icon name="chev" size={17}/></span></Button>
    <div id={`csa-faq-panel-${index}`} aria-labelledby={`csa-faq-trigger-${index}`} hidden={!active} className="csa-v2-faq-answer"><p>{item.answer}</p></div>
  </div>})}</div></section>;
}
