import Image from "next/image";
import type {ReactNode} from "react";
import {safeWorkshopImage,safeWorkshopLink} from "@/lib/workshop-rich-text";

type RichNode={type?:string;text?:string;attrs?:Record<string,unknown>;marks?:Array<{type?:string;attrs?:Record<string,unknown>}>;content?:RichNode[]};

type Variant="workshop"|"product";
function nodeChildren(node:RichNode,key:string,variant:Variant):ReactNode{return node.content?.map((child,index)=>renderNode(child,`${key}-${index}`,variant))}
function renderNode(node:RichNode,key:string,variant:Variant):ReactNode{
  if(variant==="product"&&!["doc","paragraph","heading","bulletList","orderedList","listItem","text","hardBreak"].includes(node.type??""))return null;
  if(node.type==="text"){
    let value:ReactNode=node.text||"";
    for(const mark of node.marks||[]){
      if(mark.type==="bold")value=<strong key={`${key}-bold`}>{value}</strong>;
      if(mark.type==="italic")value=<em key={`${key}-italic`}>{value}</em>;
      if(mark.type==="link"){
        const href=safeWorkshopLink(mark.attrs?.href);
        if(href&&(variant!=="product"||/^(https:|mailto:)/.test(href)||/^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/.test(href))){const external=/^https?:/.test(href);value=<a key={`${key}-link`} href={href} target={external?"_blank":undefined} rel={external?"noreferrer":undefined}>{value}</a>}
      }
    }
    return <span key={key}>{value}</span>;
  }
  if(node.type==="paragraph")return <p key={key}>{nodeChildren(node,key,variant)}</p>;
  if(node.type==="heading"){
    const content=nodeChildren(node,key,variant),level=Number(node.attrs?.level||2);
    if(level===3)return <h3 key={key}>{content}</h3>;
    if(level===4)return <h4 key={key}>{content}</h4>;
    return <h2 key={key}>{content}</h2>;
  }
  if(node.type==="bulletList")return <ul key={key}>{nodeChildren(node,key,variant)}</ul>;
  if(node.type==="orderedList")return <ol key={key} start={variant==="product"&&Number.isSafeInteger(node.attrs?.start)&&Number(node.attrs?.start)>=0?Number(node.attrs?.start):undefined}>{nodeChildren(node,key,variant)}</ol>;
  if(node.type==="listItem")return <li key={key}>{nodeChildren(node,key,variant)}</li>;
  if(node.type==="blockquote")return <blockquote key={key}>{nodeChildren(node,key,variant)}</blockquote>;
  if(node.type==="hardBreak")return <br key={key}/>;
  if(node.type==="image"){
    const src=safeWorkshopImage(node.attrs?.src);if(!src)return null;
    return <Image unoptimized className="wk-inline-image" key={key} src={src} alt={typeof node.attrs?.alt==="string"?node.attrs.alt:""} width={1200} height={675}/>;
  }
  return <>{nodeChildren(node,key,variant)}</>;
}

export function RichTextContent({document,variant="workshop"}:{document?:Record<string,unknown>;variant?:Variant}){
  return <div className={variant==="product"?"store-product-prose":"wk-prose"}>{renderNode((document||{}) as RichNode,"root",variant)}</div>;
}

export function WorkshopRichText({document}:{document?:Record<string,unknown>}){
  return <RichTextContent document={document}/>;
}
