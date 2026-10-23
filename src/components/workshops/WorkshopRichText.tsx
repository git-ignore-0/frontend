import Image from "next/image";
import type {ReactNode} from "react";
import {safeWorkshopImage,safeWorkshopLink} from "@/lib/workshop-rich-text";

type RichNode={type?:string;text?:string;attrs?:Record<string,unknown>;marks?:Array<{type?:string;attrs?:Record<string,unknown>}>;content?:RichNode[]};

function nodeChildren(node:RichNode,key:string):ReactNode{return node.content?.map((child,index)=>renderNode(child,`${key}-${index}`))}
function renderNode(node:RichNode,key:string):ReactNode{
  if(node.type==="text"){
    let value:ReactNode=node.text||"";
    for(const mark of node.marks||[]){
      if(mark.type==="bold")value=<strong key={`${key}-bold`}>{value}</strong>;
      if(mark.type==="italic")value=<em key={`${key}-italic`}>{value}</em>;
      if(mark.type==="link"){
        const href=safeWorkshopLink(mark.attrs?.href);
        if(href){const external=/^https?:/.test(href);value=<a key={`${key}-link`} href={href} target={external?"_blank":undefined} rel={external?"noreferrer":undefined}>{value}</a>}
      }
    }
    return <span key={key}>{value}</span>;
  }
  if(node.type==="paragraph")return <p key={key}>{nodeChildren(node,key)}</p>;
  if(node.type==="heading"){
    const content=nodeChildren(node,key),level=Number(node.attrs?.level||2);
    if(level===3)return <h3 key={key}>{content}</h3>;
    if(level===4)return <h4 key={key}>{content}</h4>;
    return <h2 key={key}>{content}</h2>;
  }
  if(node.type==="bulletList")return <ul key={key}>{nodeChildren(node,key)}</ul>;
  if(node.type==="orderedList")return <ol key={key}>{nodeChildren(node,key)}</ol>;
  if(node.type==="listItem")return <li key={key}>{nodeChildren(node,key)}</li>;
  if(node.type==="blockquote")return <blockquote key={key}>{nodeChildren(node,key)}</blockquote>;
  if(node.type==="hardBreak")return <br key={key}/>;
  if(node.type==="image"){
    const src=safeWorkshopImage(node.attrs?.src);if(!src)return null;
    return <Image unoptimized className="wk-inline-image" key={key} src={src} alt={typeof node.attrs?.alt==="string"?node.attrs.alt:""} width={1200} height={675}/>;
  }
  return <>{nodeChildren(node,key)}</>;
}

export function WorkshopRichText({document}:{document?:Record<string,unknown>}){
  return <div className="wk-prose">{renderNode((document||{}) as RichNode,"root")}</div>;
}
