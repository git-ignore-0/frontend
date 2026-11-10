import {RichTextContent} from "@/components/workshops/WorkshopRichText";

type DocumentNode={type?:string;text?:string;content?:DocumentNode[]};
function hasText(node:DocumentNode):boolean{
 return node.type==="text"?!!node.text?.trim():!!node.content?.some(hasText);
}

export function StoreProductDescription({description,document,heading}:{description:string;document?:Record<string,unknown>|null;heading:string}){
 if(document?!hasText(document as DocumentNode):!description.trim())return null;
 return <section className="detail-tabs store-product-information"><div><h2>{heading}</h2>{document?<RichTextContent document={document} variant="product"/>:<div className="store-product-prose"><p className="store-product-description-legacy">{description}</p></div>}</div></section>;
}
