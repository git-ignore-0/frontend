"use client";

import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from "react";
import {Button,DataState,FormSelect,Icon,Photo,SearchField} from "@/components/UI";
import {IconButton,ResponsiveDialog} from "@/components/overlays/OverlayPrimitives";
import {useOverlayDialog} from "@/components/overlays/useOverlayDialog";
import {STORE_COPY} from "@/data/store-copy";
import {money} from "@/lib/format";
import {useNFV} from "@/state/NFVContext";
import {formatUnitSize} from "@/store/store-format";
import type {StoreCategory,StoreProductCard} from "@/store/store-model";
import type {StorePriceBand,StoreSort} from "@/store/store-request";
import {useStoreCatalog} from "@/store/useStoreCatalog";

type CategoryNode=StoreCategory&{depth:number;children:CategoryNode[]};

function categoryTree(categories:StoreCategory[]):CategoryNode[]{
 const byId=new Map<string,CategoryNode>();
 categories.forEach(category=>byId.set(category.id,{...category,depth:1,children:[]}));
 const roots:CategoryNode[]=[];
 byId.forEach(node=>{
  const parent=node.parent_id?byId.get(node.parent_id):undefined;
  if(parent){node.depth=parent.depth+1;parent.children.push(node)}else roots.push(node);
 });
 const sort=(nodes:CategoryNode[])=>nodes.sort((a,b)=>a.sort_order-b.sort_order||a.name.localeCompare(b.name)).forEach(node=>{node.children.forEach(child=>{child.depth=node.depth+1});sort(node.children)});
 sort(roots);return roots;
}

export function ProductCard({product,locale}:{product:StoreProductCard;locale:"vi"|"en"}){
 const image=product.primary_image?.variants.find(variant=>variant.width>=400)?.url??product.primary_image?.url;
 return <article className="product-card">
  <a className="product-img" href={`/store/${product.slug}/${locale}`} aria-label={`${STORE_COPY[locale].view} ${product.name}`}>{product.csa_eligible&&<span className="corner-tag">CSA</span>}<Photo src={image??undefined} alt={product.name} locale={locale}/></a>
  <div className="card-copy"><a className="card-title" href={`/store/${product.slug}/${locale}`}>{product.name}</a>
   {product.alternate_name&&<div className="card-en" lang={product.content_locale==="vi"?"en":"vi"}>{product.alternate_name}</div>}
   <div className="card-bottom"><div><div className="price">{money(product.retail_price_vnd)}</div><div className="unit">/ {formatUnitSize(product.unit_size)} {product.unit_label}</div></div></div>
  </div>
 </article>;
}

function CategoryTree({tree,selectedId,expanded,allLabel,onSelect,onToggle}:{tree:CategoryNode[];selectedId?:string;expanded:string[];allLabel:string;onSelect:(id?:string)=>void;onToggle:(id:string)=>void}){
 function list(nodes:CategoryNode[]):ReactNode{return <ul className="category-tree-list" role="group">{nodes.map(node=>{
  const branch=node.children.length>0,open=expanded.includes(node.id),selected=selectedId===node.id;
  return <li className="category-tree-node" role="treeitem" aria-expanded={branch?open:undefined} aria-selected={selected} key={node.id}>
   <div className={`category-tree-row ${selected?"is-selected":""}`} style={{"--tree-depth":node.depth-1} as CSSProperties}>
    {branch?<button type="button" className={`category-tree-indicator branch category-tree-chevron ${open?"expanded":""}`} aria-label={node.name} aria-expanded={open} onClick={()=>onToggle(node.id)}><Icon name="chev" size={13}/></button>:<span className="category-tree-indicator leaf" aria-hidden="true"><span className="category-tree-dash">—</span></span>}
    <button type="button" className="category-tree-name" aria-current={selected?"page":undefined} onClick={()=>onSelect(node.id)}>{node.name}</button>
    {selected&&<span className="category-tree-selected" aria-hidden="true"><Icon name="check" size={13}/></span>}
   </div>{branch&&open&&list(node.children)}
  </li>;
 })}</ul>}
 return <><button type="button" className={`category-tree-all ${!selectedId?"is-selected":""}`} aria-current={!selectedId?"page":undefined} onClick={()=>onSelect()}>{allLabel}{!selectedId&&<Icon name="check" size={13}/>}</button>{tree.length?<nav className="category-tree" role="tree">{list(tree)}</nav>:null}</>;
}

function CategorySheet({title,closeLabel,onClose,children}:{title:string;closeLabel:string;onClose:()=>void;children:ReactNode}){
 const panelRef=useRef<HTMLElement>(null);useOverlayDialog({panelRef,onClose});
 return <div className="category-sheet-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section ref={panelRef} className="category-sheet" role="dialog" aria-modal="true" aria-labelledby="categorySheetTitle" tabIndex={-1}>
  <div className="category-sheet-grip" aria-hidden="true"/><div className="category-sheet-header"><strong id="categorySheetTitle">{title}</strong><IconButton className="category-sheet-close" onClick={onClose} label={closeLabel}/></div><div className="category-sheet-scroll"><div className="category-sheet-tree">{children}</div></div>
 </section></div>;
}

function FilterPanel({copy,csaOnly,priceBand,onCsa,onPrice}:{copy:(typeof STORE_COPY)["vi"];csaOnly:boolean;priceBand:StorePriceBand;onCsa:()=>void;onPrice:(band:StorePriceBand)=>void}){
 const prices:Array<[StorePriceBand,string]>=[["all",copy.priceAll],["low",copy.priceLow],["mid",copy.priceMid],["high",copy.priceHigh]];
 return <div className="facet-panel"><div className="facet-section"><div className="facet-label">CSA</div><button className={`facet-checkbox ${csaOnly?"selected":""}`} aria-pressed={csaOnly} onClick={onCsa}><span className="facet-check">{csaOnly&&<Icon name="check" size={13}/>}</span><span>{copy.csa}<small>{copy.csaHint}</small></span></button></div>
  <div className="facet-section"><div className="facet-label">{copy.price}</div><div className="facet-options">{prices.map(([value,label])=><button type="button" key={value} className={`facet-option ${priceBand===value?"selected":""}`} aria-pressed={priceBand===value} onClick={()=>onPrice(value)}><span className="facet-radio"/>{label}</button>)}</div></div>
 </div>;
}

function DebouncedStoreSearch({initialValue,placeholder,onCommit}:{initialValue:string;placeholder:string;onCommit:(value:string)=>void}){
 const [value,setValue]=useState(initialValue);
 useEffect(()=>{const timer=window.setTimeout(()=>onCommit(value.trim()),350);return()=>window.clearTimeout(timer)},[onCommit,value]);
 return <SearchField id="storeSearch" value={value} onChange={setValue} placeholder={placeholder} maxLength={100}/>;
}

export function Store(){
 const {ui,navigate}=useNFV(),locale=ui.locale,copy=STORE_COPY[locale];
 const catalog=useStoreCatalog(locale),{setQuery}=catalog;
 const [categoryOpen,setCategoryOpen]=useState(false),[filterOpen,setFilterOpen]=useState(false),[expanded,setExpanded]=useState<string[]>([]);
 const tree=useMemo(()=>categoryTree(catalog.categories),[catalog.categories]);
 const selectedCategory=catalog.categories.find(category=>category.id===catalog.query.categoryId);
 const active=Number(!!catalog.query.csaEligible)+Number(catalog.priceBand!=="all");
 const totalPages=Math.max(1,Math.ceil(catalog.meta.total/catalog.meta.page_size));
 useEffect(()=>{if(catalog.state==="ready"&&catalog.products.length===0&&catalog.query.page>1)setQuery({page:totalPages},{replace:true})},[catalog.products.length,catalog.query.page,catalog.state,setQuery,totalPages]);
 const currentSearch=catalog.query.search??"";
 const commitSearch=useCallback((value:string)=>{if(value!==currentSearch)setQuery({search:value||undefined,page:1})},[currentSearch,setQuery]);
 const selectCategory=(id?:string)=>{setQuery({categoryId:id,page:1});setCategoryOpen(false)};
 const toggleCategory=(id:string)=>setExpanded(value=>value.includes(id)?value.filter(item=>item!==id):[...value,id]);
 const clearFilters=()=>{setQuery({search:undefined,categoryId:undefined,csaEligible:undefined,priceBand:"all",sort:"default",page:1});setFilterOpen(false);};
 const categoryContent=catalog.categoryState==="loading"?<DataState kind="loading" compact title={copy.loading}/>:catalog.categoryState==="error"?<DataState kind="error" compact title={copy.categoriesError} action={{label:copy.retry,onClick:catalog.retryCategories}}/>:tree.length?<CategoryTree tree={tree} selectedId={catalog.query.categoryId} expanded={expanded} allLabel={copy.all} onSelect={selectCategory} onToggle={toggleCategory}/>:<p className="category-tree-empty">{copy.noCategories}</p>;
 const filterPanel=<FilterPanel copy={copy} csaOnly={!!catalog.query.csaEligible} priceBand={catalog.priceBand} onCsa={()=>setQuery({csaEligible:catalog.query.csaEligible?undefined:true,page:1})} onPrice={priceBand=>setQuery({priceBand,page:1})}/>;
 return <main className="main-content"><div className="container">
  <section className="welcome"><div className="welcome-copy"><h1>{copy.title}</h1><p>{copy.intro}</p></div><div className="welcome-media"><Photo src="/images/harvest.webp" alt={copy.welcomeImageAlt} locale={locale}/></div></section>
  <div className="store-control"><DebouncedStoreSearch key={catalog.query.search??""} initialValue={catalog.query.search??""} placeholder={copy.search} onCommit={commitSearch}/><div className="store-control-actions">
   <button type="button" className="btn btn-outline btn-small catalog-category-btn" onClick={()=>setCategoryOpen(true)}><Icon name="menu" size={13}/> {copy.categories}</button>
   <button type="button" className={`btn btn-outline btn-small catalog-filter-btn ${active?"has-filters":""}`} onClick={()=>setFilterOpen(true)}><Icon name="filter" size={15}/> {copy.filter} {active>0&&<span className="filter-count">{active}</span>}</button>
   <label className="sort-wrap"><span>{copy.sort}</span><FormSelect aria-label={copy.sort} value={catalog.query.sort} onChange={event=>setQuery({sort:event.target.value as StoreSort,page:1})}><option value="default">{copy.sortDefault}</option><option value="price_asc">{copy.sortAsc}</option><option value="price_desc">{copy.sortDesc}</option><option value="name">{copy.sortName}</option></FormSelect></label>
  </div></div>
  <section className="catalog" id="catalog" aria-label={copy.results}><div className="catalog-layout"><div className="catalog-rail"><aside className="category-sidebar" aria-label={copy.categories}><div className="category-tree-head"><strong>{copy.categories}</strong><span className="category-tree-subtitle">{copy.categoryHint}</span></div>{categoryContent}</aside>
   <section className="editorial catalog-csa-editorial" aria-label="CSA"><div><span className="eyebrow">CSA</span><h3>{copy.csaTitle}</h3><p>{copy.csaBody}</p></div><Button small variant="outline" onClick={()=>navigate("csa")}>{copy.csaLink} <Icon name="arrow" size={15}/></Button></section></div>
   <div className="catalog-main"><div className="catalog-meta"><div className="catalog-breadcrumb" aria-label={copy.categories}><span>{copy.all}</span>{selectedCategory&&<span> / {selectedCategory.name}</span>}</div><span className="catalog-results-count" aria-live="polite">{catalog.meta.total} {copy.results}</span></div>
    {active>0&&<div className="facet-chips">{catalog.query.csaEligible&&<button className="facet-chip" onClick={()=>setQuery({csaEligible:undefined,page:1})}>{copy.csa} ×</button>}{catalog.priceBand!=="all"&&<button className="facet-chip" onClick={()=>setQuery({priceBand:"all",page:1})}>{({low:copy.priceLow,mid:copy.priceMid,high:copy.priceHigh} as Record<string,string>)[catalog.priceBand]} ×</button>}<button className="facet-clear" onClick={clearFilters}>{copy.clear}</button></div>}
    {catalog.state==="loading"?<DataState kind="loading" title={copy.loading}/>:catalog.state==="error"?<DataState kind="error" title={copy.error} action={{label:copy.retry,onClick:catalog.retryProducts}}/>:catalog.products.length?<><div className="products-grid">{catalog.products.map(product=><ProductCard product={product} locale={locale} key={product.id}/>)}</div>{totalPages>1&&<nav className="catalog-pagination" aria-label={`${copy.page} ${catalog.meta.page}`}><Button small variant="outline" disabled={catalog.meta.page<=1} onClick={()=>setQuery({page:catalog.meta.page-1})}>{copy.previous}</Button><span>{copy.page} {catalog.meta.page} / {totalPages}</span><Button small variant="outline" disabled={catalog.meta.page>=totalPages} onClick={()=>setQuery({page:catalog.meta.page+1})}>{copy.next}</Button></nav>}</>:<DataState icon="search" title={catalog.meta.total===0&&!catalog.query.search&&!catalog.query.categoryId&&!active?copy.empty:copy.noResult} description={catalog.meta.total===0&&!catalog.query.search&&!catalog.query.categoryId&&!active?copy.emptyBody:copy.noResultBody} action={catalog.query.search||catalog.query.categoryId||active?{label:copy.clear,onClick:clearFilters}:undefined}/>}
   </div>
  </div></section>
  {categoryOpen&&<CategorySheet title={copy.categories} closeLabel={copy.closeCategories} onClose={()=>setCategoryOpen(false)}>{categoryContent}</CategorySheet>}
  {filterOpen&&<ResponsiveDialog title={copy.filterTitle} closeLabel={copy.closeFilter} onClose={()=>setFilterOpen(false)} className="filter-products-dialog">{filterPanel}<div className="facet-dialog-actions"><Button variant="outline" onClick={clearFilters}>{copy.clear}</Button><Button onClick={()=>setFilterOpen(false)}>{copy.view} {catalog.meta.total} {copy.results}</Button></div></ResponsiveDialog>}
 </div></main>;
}
