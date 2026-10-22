"use client";
import {useMemo} from "react";
import {useNFV} from "@/state/NFVContext";
import {getTree,productBelongsToCategory,type TreeNode} from "@/lib/catalog-categories";

export function useCatalog(){
 const {data,ui}=useNFV();
 const tree=useMemo(()=>getTree(data.categories),[data.categories]);
 const flat=useMemo(()=>{const result:TreeNode[]=[];const walk=(xs:TreeNode[])=>xs.forEach(x=>{result.push(x);walk(x.children);});walk(tree);return result;},[tree]);
 const selected=flat.find(x=>x.id===ui.selectedCategoryId)||null;
 const path=selected?flat.filter(x=>{let node:TreeNode|undefined=selected;while(node){if(node.id===x.id)return true;node=flat.find(n=>n.id===node?.parentId);}return false;}):[];
 const products=useMemo(()=>{
   const list=data.products.filter(p=>{
     if(selected&&(!productBelongsToCategory(p,selected)))return false;
     if(ui.csaOnly&&!p.csa)return false;
     if(ui.priceBand==="low"&&p.price>=25000)return false;
     if(ui.priceBand==="mid"&&(p.price<25000||p.price>35000))return false;
     if(ui.priceBand==="high"&&p.price<=35000)return false;
     const query=ui.query.trim().toLocaleLowerCase("vi");
     return !query||[p.name,p.en,p.farm,p.cat,p.unit].join(" ").toLocaleLowerCase("vi").includes(query);
   });
   if(ui.sort==="price-asc")list.sort((a,b)=>a.price-b.price);
   if(ui.sort==="price-desc")list.sort((a,b)=>b.price-a.price);
   if(ui.sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name,"vi"));
   return list;
 },[data.products,selected,ui.csaOnly,ui.priceBand,ui.query,ui.sort]);
 return {tree,flat,selected,path,products};
}
