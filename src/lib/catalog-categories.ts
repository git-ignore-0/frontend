import type {Category,Product} from "@/types";

export type TreeNode=Category & {parentId:string|null;depth:number;children:TreeNode[]};
export function getTree(rows:Category[]):TreeNode[]{
 const flat=rows.some(x=>x.parentId!==undefined);
 const taken=new Set<string>();
 function make(row:Category,depth:number,parentId:string|null):TreeNode|null{
   if(depth>3||!row||!String(row.id||"").trim()||!String(row.name||"").trim()||taken.has(row.id))return null;
   taken.add(row.id);return {id:String(row.id),name:String(row.name),parentId,depth,children:[]};
 }
 if(!flat){
   const visit=(row:Category,depth=1,parentId:string|null=null):TreeNode|null=>{
     const node=make(row,depth,parentId);if(!node)return null;
     node.children=(row.children||[]).map(x=>visit(x,depth+1,node.id)).filter((x):x is TreeNode=>!!x);
     return node;
   };
   return rows.map(x=>visit(x)).filter((x):x is TreeNode=>!!x);
 }
 const lookup=new Map(rows.map(x=>[x.id,x]));
 const visit=(row:Category,depth=1,parentId:string|null=null,chain=new Set<string>()):TreeNode|null=>{
   if(chain.has(row.id))return null;
   const node=make(row,depth,parentId);if(!node)return null;
   const next=new Set(chain);next.add(row.id);
   node.children=rows.filter(x=>x.parentId===node.id).map(x=>visit(x,depth+1,node.id,next)).filter((x):x is TreeNode=>!!x);
   return node;
 };
 return rows.filter(x=>!x.parentId||!lookup.has(x.parentId)).map(x=>visit(x)).filter((x):x is TreeNode=>!!x);
}
/** Match a category and all of its nested descendants, by stable id or API label. */
export function productBelongsToCategory(product:Product, selected:TreeNode):boolean {
  const allowed=new Set<string>();
  const visit=(node:TreeNode)=>{allowed.add(node.id);allowed.add(node.name);node.children.forEach(visit);};
  visit(selected);
  return allowed.has(product.categoryId||product.cat)||allowed.has(product.cat);
}
