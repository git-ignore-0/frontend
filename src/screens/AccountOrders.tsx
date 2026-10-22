"use client";
import {PagedList} from "@/components/account/PagedList";
import {useMemo,useState} from "react";
import {Button,DataState,FormInput,Icon,MoneyLine,Photo,SearchField,Tabs} from "@/components/UI";
import {useNFV} from "@/state/NFVContext";
import {dateLabel,money,isoDay} from "@/lib/format";
import type {Order} from "@/types";

const statuses=[["all","Tất cả"],["processing","Đang xử lý"],["shipping","Đang giao"],["completed","Hoàn thành"],["cancelled","Đã hủy"]];
const statusText:Record<string,[string,string]>={processing:["Đang xử lý","processing"],shipping:["Đang giao","shipping"],completed:["Hoàn thành","completed"],cancelled:["Đã hủy","cancelled"]};
function OrderStatus({order}:{order:Order}){const [text,tone]=statusText[order.status]||["Chưa xác định","neutral"];return <span className={`acc-status ${tone}`}>{text}</span>;}
const dayNumber=(text:string)=>{const d=Date.parse(text);return Number.isFinite(d)?Math.floor(d/86400000):NaN;};
export function checkOrderRange(start:string,end:string){
 const a=dayNumber(start),b=dayNumber(end),today=dayNumber(isoDay(new Date()));
 if(!Number.isFinite(a)||!Number.isFinite(b))return "Vui lòng chọn đủ ngày bắt đầu và kết thúc.";
 if(b<a)return "Ngày kết thúc không được trước ngày bắt đầu.";
 if(b-a>29)return "Mỗi lần tìm chỉ được chọn tối đa 30 ngày (tính cả hai ngày).";
 if(b>today)return "Ngày kết thúc không được lớn hơn ngày hôm nay.";
 return "";
}
function DateRange(){
 const {ui,patch}=useNFV();
 const [start,setStart]=useState(ui.orderStart),[end,setEnd]=useState(ui.orderEnd);
 const error=checkOrderRange(start,end);const today=isoDay(new Date());
 const preset=(days:number)=>{const d=new Date();d.setDate(d.getDate()-days+1);setStart(isoDay(d));setEnd(today);};
 return <div className="hist-period order-date-filter"><span className="order-date-caption">Thời gian</span>
   <button className="order-date-trigger" aria-expanded={ui.orderDateOpen} onClick={()=>{setStart(ui.orderStart);setEnd(ui.orderEnd);patch({orderDateOpen:!ui.orderDateOpen});}}><Icon name="clock" size={14}/> <span className="order-date-current">{dateLabel(ui.orderStart)} – {dateLabel(ui.orderEnd)}</span><span className="order-date-caret">▾</span></button>
   {ui.orderDateOpen&&<div className="order-date-panel" id="orderDatePanel" role="group" aria-label="Chọn khoảng ngày tìm đơn">
     <div className="order-date-panel-heading"><strong>Chọn khoảng thời gian</strong><button onClick={()=>patch({orderDateOpen:false})} aria-label="Đóng bảng chọn ngày">×</button></div>
     <div className="order-date-fields"><label>Từ ngày <FormInput type="date" aria-label="Ngày bắt đầu" value={start} max={today} onChange={e=>setStart(e.target.value)}/></label><label>Đến ngày <FormInput type="date" aria-label="Ngày kết thúc" value={end} max={today} onChange={e=>setEnd(e.target.value)}/></label></div>
     <div className="order-date-quick"><button onClick={()=>preset(7)}>7 ngày gần đây</button><button onClick={()=>preset(30)}>30 ngày gần đây</button></div>
     <p className="order-date-hint">Chọn tối đa 30 ngày cho mỗi lần tìm. Có thể chọn khoảng ngày cũ.</p><p className="order-date-error" role="alert">{error}</p>
     <Button small className="order-date-apply" disabled={!!error} onClick={()=>patch({orderStart:start,orderEnd:end,orderDateOpen:false,visible:{...ui.visible,orders:7}})}>Áp dụng</Button>
   </div>}
 </div>;
}
export function OrdersView(){
 const {data,ui,patch,navigate}=useNFV();
 const all=useMemo(()=>[...data.orders].sort((a,b)=>dayNumber(b.date)-dayNumber(a.date)),[data.orders]);
 const period=all.filter(o=>{const day=dayNumber(o.date);return day>=dayNumber(ui.orderStart)&&day<=dayNumber(ui.orderEnd);});
 const orders=period.filter(o=>(ui.orderStatus==="all"||o.status===ui.orderStatus)&&
   (!ui.orderSearch.trim()||[o.id,...o.lines.map(l=>l.name)].join(" ").toLocaleLowerCase("vi").includes(ui.orderSearch.trim().toLocaleLowerCase("vi"))));
 const clear=()=>{const d=new Date(),prev=new Date();prev.setDate(d.getDate()-29);patch({orderSearch:"",orderStatus:"all",orderStart:isoDay(prev),orderEnd:isoDay(d),orderDateOpen:false,visible:{...ui.visible,orders:7}});};
 const filterItems=statuses.map(([value,label])=>({value,label,count:value==="all"?period.length:period.filter(o=>o.status===value).length}));
 return <section className="acc-section nfv-orders-section"><div className="acc-heading"><div><h2>Đơn hàng nông sản</h2></div></div>
   <div className="hist-control-head"><div className="acc-search-row"><SearchField small id="accountOrderSearch" value={ui.orderSearch} onChange={v=>patch({orderSearch:v,visible:{...ui.visible,orders:7}})} placeholder="Tìm mã đơn hoặc sản phẩm"/><DateRange/></div></div>
   <Tabs items={filterItems} value={ui.orderStatus} onChange={v=>patch({orderStatus:v,visible:{...ui.visible,orders:7}})} label="Lọc theo trạng thái đơn hàng"/>
   <div id="accountOrdersList" className="account-orders-list">{orders.length?<PagedList kind="orders" items={orders} emptyTitle="Chưa có đơn hàng" render={o=><article className="acc-order" key={o.id}>
     <div className="acc-order-top"><div className="hist-shrink"><button className="acc-order-id" onClick={()=>navigate("order-detail",{productId:o.id})}>{o.id}</button><div className="acc-subline">{dateLabel(o.date)} · {o.count} đơn vị</div></div><OrderStatus order={o}/></div>
     <div className="acc-order-mid"><div className="acc-order-thumbs">{o.lines.slice(0,3).map((line,i)=>{const p=data.products.find(x=>x.name===line.name);return <span className={`acc-thumb ${p?"":"acc-thumb-text"}`} key={i}>{p?<Photo src={p.image} alt={line.name}/>:<Icon name="leaf" size={14}/>}</span>;})}</div>
       <div className="acc-order-names">{o.lines.map(l=>l.name).join(", ")}<small>{o.credits?`Có dùng CSA · ${o.credits} suất`:""}</small></div><div className="acc-order-total">{money(o.total)}<small>Tiền hàng</small></div></div>
     <div className="acc-order-bottom"><Button small variant="plain" onClick={()=>navigate("order-detail",{productId:o.id})}>Xem chi tiết <Icon name="arrow" size={14}/></Button></div>
   </article>}/>:<DataState icon="search" title={all.length?"Không có đơn phù hợp":"Chưa có đơn hàng"} description={all.length?"Thử từ khóa, thời gian hoặc trạng thái khác.":"Các đơn hàng sẽ xuất hiện tại đây."} action={all.length?{label:"Xóa bộ lọc",onClick:clear}:undefined}/>}</div>
 </section>;
}
export function OrderDetail(){
 const {data,ui,navigate,patch}=useNFV();const order=data.orders.find(o=>o.id===ui.productId);
 if(!order)return <main className="main-content"><div className="container"><DataState title="Chưa có đơn hàng" action={{label:"Quay lại đơn hàng",onClick:()=>navigate("account",{tab:"orders",hub:false})}}/></div></main>;
 return <main className="main-content order-detail-page"><div className="container"><button className="mobile-order-back" onClick={()=>navigate("account",{tab:"orders",hub:false})}><Icon name="back" size={16}/> Quay lại Đơn hàng</button>
   <div className="breadcrumbs"><button onClick={()=>navigate("account")}>Tài khoản</button><Icon name="chev" size={13}/><button onClick={()=>navigate("account",{tab:"orders",hub:false})}>Đơn hàng nông sản</button><Icon name="chev" size={13}/><strong>{order.id}</strong></div>
   <div className="account-title" style={{marginBottom:18}}><div><span className="eyebrow">CHI TIẾT ĐƠN HÀNG</span><div className="order-detail-heading-line"><h1>{order.id}</h1><OrderStatus order={order}/></div><span className="sm muted">Đặt ngày {dateLabel(order.date)}</span></div></div>
   <div className="checkout-layout order-detail-layout"><section className="acc-section order-detail-products"><div className="acc-heading"><h2>Sản phẩm đã đặt</h2></div><div className="acc-detail-lines">
     {order.lines.map((l,i)=>{const p=data.products.find(p=>p.name===l.name);return <div className="acc-detail-line" key={i}><span className="acc-detail-thumb">{p?<Photo src={p.image} alt={l.name}/>:<Icon name="leaf" size={16}/>}</span><div className="grow"><strong>{l.name}</strong><small>{l.unit} · {l.qty} × {money(l.price)}</small></div><strong>{money(l.qty*l.price)}</strong></div>;})}
   </div></section><section className="acc-section order-detail-shipping"><div className="acc-heading"><h2>Giao / nhận hàng</h2></div>
   <div className="acc-info-grid"><div><span>Người nhận</span><strong>{order.name}</strong></div><div><span>Số điện thoại</span><strong>{order.phone}</strong></div><div className="acc-wide"><span>Địa chỉ</span><strong>{order.address}</strong></div><div><span>Phương thức</span><strong>{order.shipping==="pickup"?"Nhận tại điểm hẹn":"Giao tới địa chỉ"}</strong></div></div></section>
   <div className="acc-detail-actions order-detail-actions"><Button small variant="outline" onClick={()=>navigate("account",{tab:"orders",hub:false})}><Icon name="back" size={14}/> Lịch sử đơn</Button><Button small variant="plain" onClick={()=>patch({toast:"Thông tin liên hệ hỗ trợ thực tế cần kết nối với NFV."})}><Icon name="info" size={14}/> Liên hệ hỗ trợ</Button></div>
   <aside className="checkout-summary order-detail-cost" aria-label="Chi tiết tiền hàng"><h3>Chi tiết tiền hàng</h3><MoneyLine label="Tiền hàng tại lúc đặt" value={money(order.subtotal)}/><MoneyLine label="Quyền lợi CSA đã dùng" value={order.credits?`−${money(order.saved)} (${order.credits} suất)`:"Không dùng"}/><hr className="summary-divider"/><MoneyLine label="Tiền hàng" value={money(order.total)} large/></aside>
   </div></div></main>;
}
