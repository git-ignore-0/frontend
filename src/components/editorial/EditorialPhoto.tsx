import {siteImageSrc} from "@/lib/site-assets";
/** Non-interactive editorial media; preserves the source photographs and crop styling. */
export function EditorialPhoto({file,alt="",position="center",priority=false}:{file:string;alt?:string;position?:string;priority?:boolean}){
  return <img src={siteImageSrc(file)} alt={alt} style={{objectPosition:position}}
    loading={priority?"eager":"lazy"} fetchPriority={priority?"high":"auto"} decoding="async"/>;
}
