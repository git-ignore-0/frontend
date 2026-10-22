"use client";
import {useEffect,useRef,type RefObject} from "react";

let previousOverflow = "";
let backgroundInert: Array<{element:HTMLElement;wasInert:boolean}> = [];
const activePanels: HTMLElement[] = [];
const focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Shared dialog keyboard, focus restoration and reference-counted scroll lock. */
export function useOverlayDialog({panelRef,returnRef,onClose}:{
  panelRef:RefObject<HTMLElement|null>;
  returnRef?:RefObject<HTMLElement|null>;
  onClose:()=>void;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(()=>{
    const panel = panelRef.current;
    if (!panel) return;
    const previousFocus = document.activeElement as HTMLElement|null;
    const target = returnRef?.current ?? previousFocus;
    if (!activePanels.length) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const app=panel.closest(".nfv-app");
      backgroundInert=Array.from(app?.children ?? [])
        .filter(element=>!element.contains(panel))
        .map(element=>({element:element as HTMLElement,wasInert:(element as HTMLElement).inert}));
      backgroundInert.forEach(({element})=>{element.inert=true;});
    }
    activePanels.push(panel);
    const focusable = [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter(node=>node.getClientRects().length>0);
    (focusable[0] ?? panel).focus();
    const handleKey = (event:KeyboardEvent) => {
      if (activePanels.at(-1)!==panel) return;
      if (event.key==="Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      } else if (event.key==="Tab") {
        const items = [...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter(node=>node.getClientRects().length>0);
        if (!items.length) {event.preventDefault();panel.focus();return;}
        const first=items[0],last=items[items.length-1];
        if(event.shiftKey && (document.activeElement===first || !panel.contains(document.activeElement))){event.preventDefault();last.focus();}
        else if(!event.shiftKey && (document.activeElement===last || !panel.contains(document.activeElement))){event.preventDefault();first.focus();}
      }
    };
    document.addEventListener("keydown",handleKey,true);
    return ()=>{
      document.removeEventListener("keydown",handleKey,true);
      const idx=activePanels.indexOf(panel);
      if(idx!==-1)activePanels.splice(idx,1);
      if(!activePanels.length){
        document.body.style.overflow=previousOverflow;
        backgroundInert.forEach(({element,wasInert})=>{element.inert=wasInert;});
        backgroundInert=[];
      }
      // Never restore focus behind another open overlay.
      const top=activePanels.at(-1);
      if(top){
        if(target?.isConnected && top.contains(target)) target.focus();
        else top.focus();
      } else if(target?.isConnected) target.focus();
    };
  },[panelRef,returnRef]);
}
