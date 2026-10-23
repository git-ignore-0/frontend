"use client";
import {useId,useRef,type ReactNode,type RefObject} from "react";
import {Icon} from "@/components/UI";
import {useOverlayDialog} from "./useOverlayDialog";

export function IconButton({label,onClick,className=""}:{label:string;onClick:()=>void;className?:string}){
  return <button type="button" className={`icon-btn ${className}`.trim()} aria-label={label} onClick={onClick}><Icon name="close" size={19}/></button>;
}

type OverlayProps = {
  title:string;
  onClose:()=>void;
  children:ReactNode;
  returnRef?:RefObject<HTMLElement|null>;
  className?:string;
  closeLabel:string;
  descriptionId?:string;
};

/** Store cart, store filters and Stories use the same overlay/focus contract. */
/** One side-panel visual for mobile navigation, cart and community stories. */
export function SideDrawer({title,onClose,children,returnRef,className="",closeLabel}:OverlayProps){
  const panelRef=useRef<HTMLElement>(null);
  const titleId=useId();
  useOverlayDialog({panelRef,returnRef,onClose});
  return <div className={`nfv-mobile-nav-overlay nfv-unified-panel-overlay ${className}`.trim()} onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <aside className="nfv-mobile-nav-panel nfv-unified-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={panelRef}>
      <div className="nfv-mobile-nav-heading">
        <h2 id={titleId} title={title}>{title}</h2>
        <IconButton className="nfv-mobile-nav-close" label={closeLabel} onClick={onClose}/>
      </div>
      {children}
    </aside>
  </div>;
}

/** Desktop centered dialog, mobile bottom sheet; uses Store surface/color tokens. */
export function ResponsiveDialog({title,onClose,children,returnRef,className="",closeLabel,descriptionId}:OverlayProps){
  const panelRef=useRef<HTMLElement>(null),titleId=useId();
  useOverlayDialog({panelRef,returnRef,onClose});
  return <div className={`filter-sheet nfv-responsive-dialog ${className}`.trim()} onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section className="filter-sheet-inner" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} ref={panelRef}>
      <div className="nfv-dialog-head"><h2 id={titleId}>{title}</h2><IconButton label={closeLabel} onClick={onClose}/></div>
      <div className="nfv-dialog-body">{children}</div>
    </section>
  </div>;
}
