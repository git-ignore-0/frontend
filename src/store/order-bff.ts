export type StoreOrderQueryPolicy="none"|"orders"|"quota"|"locale";
export type StoreOrderTarget={path:string;session:"none"|"optional"|"required";query:StoreOrderQueryPolicy;guestOrder?:boolean;lookupCookie?:boolean};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function storeOrderTarget(path:string[],method:"GET"|"POST"):StoreOrderTarget|null{
 if(path.length===1&&path[0]==="delivery-dates"&&method==="GET")return {path:"/api/v1/public/store-delivery-dates",session:"optional",query:"none"};
 if(path.length===1&&path[0]==="quote"&&method==="POST")return {path:"/api/v1/public/store-quotes",session:"optional",query:"none"};
 if(path.length===1&&path[0]==="checkout"&&method==="POST")return {path:"/api/v1/public/store-checkouts",session:"optional",query:"none",guestOrder:true};
 if(path.length===1&&path[0]==="shipping-quote"&&method==="POST")return {path:"/api/v1/public/shipping-quotes",session:"none",query:"none"};
 if(path.length===1&&path[0]==="quota"&&method==="GET")return {path:"/api/v1/memberships/quota",session:"required",query:"quota"};
 if(path.length===1&&path[0]==="user-orders"&&method==="GET")return {path:"/api/v1/store-orders",session:"required",query:"orders"};
 if(path.length===3&&path[0]==="user-orders"&&UUID.test(path[1])&&path[2]==="buy-again"&&method==="GET")return {path:`/api/v1/store-orders/${path[1]}/buy-again`,session:"required",query:"locale"};
 if(path.length===2&&path[0]==="user-orders"&&UUID.test(path[1])&&method==="GET")return {path:`/api/v1/store-orders/${path[1]}`,session:"required",query:"none"};
 if(path.length===1&&path[0]==="lookup"&&method==="POST")return {path:"/api/v1/public/store-order-lookups",session:"none",query:"none",lookupCookie:true};
 if(path.length===2&&path[0]==="lookup"&&path[1]==="current"&&method==="GET")return {path:"/api/v1/public/store-order-lookups/current",session:"none",query:"none",lookupCookie:true};
 if(path.length>=2&&path[0]==="orders"&&UUID.test(path[1])){
  if(path.length===2&&method==="GET")return {path:`/api/v1/public/store-orders/${path[1]}`,session:"optional",query:"none",guestOrder:true};
  if(path.length===3&&method==="POST"&&(path[2]==="report-transfer"||path[2]==="cancel"))return {path:`/api/v1/public/store-orders/${path[1]}/${path[2]}`,session:"optional",query:"none",guestOrder:true};
 }
 return null;
}
export function storeOrderQueryAllowed(url:URL,policy:StoreOrderQueryPolicy){
 const keys=[...url.searchParams.keys()],allowed=policy==="locale"?["locale"]:policy==="orders"?["page","page_size","status"]:policy==="quota"?["locale","store_order_id"]:[];
 if(keys.some(key=>!allowed.includes(key))||keys.some(key=>url.searchParams.getAll(key).length!==1))return false;
 const page=url.searchParams.get("page"),size=url.searchParams.get("page_size"),locale=url.searchParams.get("locale"),order=url.searchParams.get("store_order_id"),status=url.searchParams.get("status");
 return (!page||/^[1-9]\d{0,3}$/.test(page))&&(!size||/^(?:[1-9]|[1-4]\d|50)$/.test(size))&&(!locale||locale==="vi"||locale==="en")&&(!order||UUID.test(order))&&(!status||["payment_pending","pending_review","pending_delivery","delivered","cancelled"].includes(status));
}
