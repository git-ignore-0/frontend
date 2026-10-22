"use client";
import {IconButton,ResponsiveDialog} from "@/components/overlays/OverlayPrimitives";
import {useOverlayDialog} from "@/components/overlays/useOverlayDialog";
import type {TreeNode} from "@/lib/catalog-categories";
import {useCatalog} from "@/hooks/useCatalog";
import {useRef, type CSSProperties, type ReactNode} from "react";
import {Button,DataState,FormSelect,Icon,Photo,Quantity,SearchField} from "@/components/UI";
import {useNFV} from "@/state/NFVContext";
import {money} from "@/lib/format";
import type {Product} from "@/types";

export function ProductCard({product:p}:{product:Product}){
 const {navigate,addCart}=useNFV();
 return <article className="product-card"><button className="product-img" onClick={()=>navigate("product",{productId:p.id})} aria-label={`Xem ${p.name}`}>{p.csa&&<span className="corner-tag">CSA</span>}<Photo src={p.image} alt={p.name}/></button>
   <div className="card-copy"><button className="card-title" onClick={()=>navigate("product",{productId:p.id})}>{p.name}</button>
   <div className="card-en" lang="en">{p.en}</div><div className="card-bottom"><div><div className="price">{money(p.price)}</div><div className="unit">/ {p.unit}</div></div><button className="add-mini" onClick={()=>addCart(p.id)} aria-label={`Thêm ${p.name} vào giỏ`}><Icon name="plus" size={18}/></button></div></div>
 </article>;
}
function CategoryTree({tree,selectedId,expanded,onSelect,onToggle}:{tree:TreeNode[];selectedId:string|null;expanded:string[];onSelect:(id:string|null)=>void;onToggle:(id:string)=>void}){
 function list(nodes:TreeNode[]):ReactNode{
   return <ul className="category-tree-list" role="group">{nodes.map(node=>{
     const branch=!!node.children.length,open=expanded.includes(node.id),selected=selectedId===node.id;
     return <li className="category-tree-node" role="treeitem" aria-expanded={branch?open:undefined} aria-selected={!branch?selected:undefined} key={node.id}>
       <button type="button" className={`category-tree-row ${selected?"is-selected":""}`} style={{"--tree-depth":node.depth-1} as CSSProperties}
        aria-expanded={branch?open:undefined} aria-current={selected?"page":undefined} onClick={()=>branch?onToggle(node.id):onSelect(node.id)}>
         <span className={`category-tree-indicator ${branch?"branch":"leaf"}`} aria-hidden="true">{branch?<span className={`category-tree-chevron ${open?"expanded":""}`}><Icon name="chev" size={13}/></span>:<span className="category-tree-dash">—</span>}</span>
         <span className="category-tree-name">{node.name}</span>{selected&&<span className="category-tree-selected" aria-label="Đang chọn"><Icon name="check" size={13}/></span>}
       </button>{branch&&open&&list(node.children)}
     </li>;
   })}</ul>;
 }
 return <><button className={`category-tree-all ${!selectedId?"is-selected":""}`} aria-current={!selectedId?"page":undefined} onClick={()=>onSelect(null)}>Tất cả nông sản{!selectedId&&<Icon name="check" size={13}/>}</button>
 {tree.length?<nav aria-label="Cây danh mục sản phẩm" className="category-tree" role="tree">{list(tree)}</nav>:<p className="category-tree-empty">Chưa có danh mục</p>}</>;
}
export function CategoryNavigation({mobile=false}:{mobile?:boolean}){
 const {ui,patch}=useNFV();const {tree}=useCatalog();
 const expanded=ui.expandedCategoryIds.length?ui.expandedCategoryIds:(tree[0]?.children.length?[tree[0].id]:[]);
 const select=(id:string|null)=>patch({selectedCategoryId:id,categoryOpen:false});
 const toggle=(id:string)=>patch({expandedCategoryIds:expanded.includes(id)?expanded.filter(x=>x!==id):[...expanded,id]});
 const content=<CategoryTree tree={tree} selectedId={ui.selectedCategoryId} expanded={expanded} onSelect={select} onToggle={toggle}/>;
 if(!mobile)return <><div className="category-tree-head"><strong>Danh mục</strong><span className="category-tree-subtitle">Chọn theo nhóm nông sản</span></div>{content}</>;
 return <CategorySheet onClose={()=>patch({categoryOpen:false})}>{content}</CategorySheet>;
}
function CategorySheet({onClose,children}:{onClose:()=>void;children:ReactNode}){
 const panelRef=useRef<HTMLElement>(null);
 useOverlayDialog({panelRef,onClose});
 return <div className="category-sheet-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
   <section ref={panelRef} className="category-sheet" role="dialog" aria-modal="true" aria-labelledby="categorySheetTitle" tabIndex={-1}>
     <div className="category-sheet-grip" aria-hidden="true"/>
     <div className="category-sheet-header"><strong id="categorySheetTitle">Danh mục</strong><IconButton className="category-sheet-close" onClick={onClose} label="Đóng danh mục"/></div>
     <div className="category-sheet-scroll"><div className="category-sheet-tree">{children}</div></div>
   </section>
 </div>;
}
export function FilterPanel(){
 const {ui,patch}=useNFV();
 return <div className="facet-panel"><div className="facet-section"><div className="facet-label">Quyền lợi CSA</div>
   <button className={`facet-checkbox ${ui.csaOnly?"selected":""}`} aria-pressed={ui.csaOnly} onClick={()=>patch({csaOnly:!ui.csaOnly})}>
   <span className="facet-check">{ui.csaOnly&&<Icon name="check" size={13}/>}</span><span>Chỉ sản phẩm có thể dùng CSA<small>Chỉ áp dụng khi có gói phù hợp</small></span></button></div>
   <div className="facet-section"><div className="facet-label">Khoảng giá / đơn vị bán</div><div className="facet-options">
     {([["all","Tất cả mức giá"],["low","Dưới 25.000đ"],["mid","25.000–35.000đ"],["high","Trên 35.000đ"]] as const).map(([value,label])=><button key={value} className={`facet-option ${ui.priceBand===value?"selected":""}`} aria-pressed={ui.priceBand===value} onClick={()=>patch({priceBand:value})}><span className="facet-radio"/>{label}</button>)}
   </div></div></div>;
}
export function FilterSheet(){
 const {ui,patch}=useNFV();const {products}=useCatalog();
 if(!ui.filterOpen)return null;
 return <ResponsiveDialog title="Bộ lọc sản phẩm" closeLabel="Đóng bộ lọc" onClose={()=>patch({filterOpen:false})} className="filter-products-dialog">
   <FilterPanel/><div className="facet-dialog-actions"><Button variant="outline" onClick={()=>patch({csaOnly:false,priceBand:"all"})}>Xóa lọc</Button><Button onClick={()=>patch({filterOpen:false})}>Xem {products.length} sản phẩm</Button></div>
 </ResponsiveDialog>;
}
export function Store(){
 const {ui,patch,navigate,data}=useNFV();const {products,path}=useCatalog();
 const active=Number(ui.csaOnly)+Number(ui.priceBand!=="all");
 return <main className="main-content"><div className="container">
  <section className="welcome"><div className="welcome-copy"><div className="eyebrow">NFV STORE</div><h1>Nông sản tươi, chọn thật dễ.</h1><p>Rau, củ, quả và gia vị từ các nông trại — thông tin rõ ràng, giá theo quy cách cố định.</p></div><div className="welcome-media"><Photo alt="Nông sản tại chợ Việt Nam"/></div></section>
  <div className="store-control">
   <SearchField id="storeSearch" value={ui.query} onChange={query=>patch({query})} placeholder="Tìm nông sản, ví dụ: rau muống, cà chua..."/>
   <div className="store-control-actions">
    <button type="button" className="btn btn-outline btn-small catalog-category-btn" onClick={()=>patch({categoryOpen:true,expandedCategoryIds:[]})}><Icon name="menu" size={13}/> Danh mục</button>
    <button type="button" className={`btn btn-outline btn-small catalog-filter-btn ${active?"has-filters":""}`} onClick={()=>patch({filterOpen:true})}><Icon name="filter" size={15}/> Lọc {active>0&&<span className="filter-count">{active}</span>}</button>
    <label className="sort-wrap"><span>Sắp xếp</span><FormSelect aria-label="Sắp xếp" value={ui.sort} onChange={e=>patch({sort:e.target.value})}><option value="featured">Mặc định</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option><option value="name">Tên A–Z</option></FormSelect></label>
   </div>
  </div>
  <section className="catalog" id="catalog" aria-label="Danh sách nông sản"><div className="catalog-layout">
   <div className="catalog-rail">
    <aside className="category-sidebar" id="desktopCategoryNavigation" aria-label="Danh mục nông sản"><CategoryNavigation/></aside>
    <section className="editorial catalog-csa-editorial" aria-label="Đăng ký dài hạn"><div><span className="eyebrow">ĐĂNG KÝ DÀI HẠN</span><h3>Đồng hành cùng nông trại qua CSA.</h3><p>CSA là chương trình đăng ký riêng, không phải một sản phẩm trong giỏ hàng.</p></div><Button small variant="outline" onClick={()=>navigate("csa")}>Tìm hiểu CSA <Icon name="arrow" size={15}/></Button></section>
   </div>
   <div className="catalog-main">
    <div className="catalog-meta"><div className="catalog-breadcrumb" aria-label="Đường dẫn danh mục">{path.map((p,i)=><span key={p.id}>{i>0&&" / "}{p.name}</span>)}</div><span className="catalog-results-count" aria-live="polite">{products.length} sản phẩm</span></div>
    <div id="catalogPanel">
     {active>0&&<div className="facet-chips">{ui.csaOnly&&<button className="facet-chip" onClick={()=>patch({csaOnly:false})}>Có thể dùng CSA ×</button>}{ui.priceBand!=="all"&&<button className="facet-chip" onClick={()=>patch({priceBand:"all"})}>{({low:"Dưới 25.000đ",mid:"25.000–35.000đ",high:"Trên 35.000đ"} as Record<string,string>)[ui.priceBand]} ×</button>}<button className="facet-clear" onClick={()=>patch({csaOnly:false,priceBand:"all"})}>Xóa bộ lọc</button></div>}
     {products.length?<div className="products-grid">{products.map(p=><ProductCard product={p} key={p.id}/>)}</div>:<DataState icon="search" title={data.products.length?"Không tìm thấy sản phẩm phù hợp":"Chưa có sản phẩm"} description={data.products.length?"Thử từ khóa hoặc bộ lọc khác.":"Sản phẩm nông sản sẽ được hiển thị tại đây khi có dữ liệu."} action={data.products.length?{label:"Xóa bộ lọc",onClick:()=>patch({csaOnly:false,priceBand:"all",query:""})}:undefined}/>}
    </div>
   </div>
  </div></section>
 </div></main>;
}
export function ProductDetail(){
 const {data,ui,patch,navigate,addCart}=useNFV();
 const product=data.products.find(p=>p.id===ui.productId)||data.products[0];
 if(!product)return <Store/>;
 const related=data.products.filter(x=>x.id!==product.id&&(x.cat===product.cat||x.csa===product.csa)).slice(0,4);
 return <main className="main-content"><div className="container"><div className="breadcrumbs"><button onClick={()=>navigate("store")}>Cửa hàng</button><Icon name="chev" size={13}/><button onClick={()=>navigate("store")}>{product.cat}</button><Icon name="chev" size={13}/><strong style={{color:"var(--ink)"}}>{product.name}</strong></div>
   <div className="detail-layout"><div><div className="detail-photo"><Photo src={product.image} alt={product.name}/></div><div className="detail-thumbs"><span className="detail-thumb"><Photo src={product.image} alt={product.name}/></span><span className="detail-thumb-note">Ảnh sản phẩm</span></div></div>
   <div className="detail-info"><div className="flex gap6">{product.csa&&<span className="status">Có thể dùng CSA*</span>}</div><h1>{product.name}</h1><p className="muted" style={{margin:0,fontSize:12}}>{product.en} · {product.id.toUpperCase()}</p>
    <div className="detail-price">{money(product.price)}</div><div className="detail-unit">/ {product.unit} <span className="muted">· Giá theo quy cách</span></div><p className="detail-desc">{product.description}</p>
    <div className="detail-select"><label className="label">Chọn số lượng <span className="muted" style={{fontWeight:400}}>(theo {product.unit})</span></label><Quantity count={ui.detailQty} onMinus={()=>patch({detailQty:Math.max(1,ui.detailQty-1)})} onPlus={()=>patch({detailQty:Math.min(99,ui.detailQty+1)})}/></div>
    <div className="buy-row"><Button onClick={()=>addCart(product.id,ui.detailQty)}><Icon name="bag" size={17}/> Thêm vào giỏ · {money(product.price*ui.detailQty)}</Button></div>
    <div className="detail-trust"><span className="status neutral"><Icon name="box" size={12}/> Quy cách cố định</span><span className="status neutral"><Icon name="leaf" size={12}/> Có thông tin nông trại</span></div>
    <div className="detail-pane"><strong><Icon name="pin" size={14}/> &nbsp; Nguồn cung</strong><p>{product.farm}. Sản phẩm có thể được nhiều trang trại cung cấp; khách không bắt buộc chọn farm. </p></div>
    {product.csa&&<div className="detail-pane" style={{background:"#f8f4e8",borderColor:"#e9e0c5"}}><strong><Icon name="star" size={14}/> &nbsp; Quyền lợi CSA</strong><p>Nếu sản phẩm đủ điều kiện, bạn có thể chọn sử dụng quota CSA khi đặt hàng.</p></div>}</div></div>
   <div className="detail-tabs"><div><h3>Thông tin sản phẩm</h3><p>{product.description}</p></div><div><h3>Gợi ý bảo quản</h3><p>{product.note}</p></div></div>
   <section className="section-spacing"><div className="block-head"><div><h2 className="section-title">Có thể bạn cũng thích</h2><p>Các sản phẩm cùng nhóm để tiếp tục khám phá.</p></div><Button small variant="plain" onClick={()=>navigate("store")}>Đi chợ tiếp <Icon name="arrow" size={15}/></Button></div><div className="related-grid">{related.map(p=><ProductCard key={p.id} product={p}/>)}</div></section>
 </div></main>;
}
