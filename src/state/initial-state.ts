import type {AccountTab,CatalogData,FetchStatus,Locale,Recipient,Resource,Screen} from "@/types";

export interface UIState {
  page: Screen; productId: string; accountTab: AccountTab; accountHubOpen: boolean; locale: Locale;
  query: string; sort: string; selectedCategoryId: string | null; expandedCategoryIds: string[];
  csaOnly: boolean; priceBand: string; cart: Record<string,number>; cartOpen: boolean; filterOpen: boolean; categoryOpen: boolean;
  detailQty: number; checkoutStep: 0|1; checkoutEditRecipient: boolean; checkoutEditFromReview: boolean;
  recipient: Recipient; couponDraft: string; couponCode: string; couponAmount: number; couponError: string; applyCSA: Record<string,boolean>;
  orderSearch: string; orderStatus: string; orderStart: string; orderEnd: string; orderDateOpen: boolean;
  visible: Record<string,number>; profileEditing: boolean; addressEditing: boolean;
  referrerDraft: string; referrerError: string; giftId: string | null; giftPhase: "confirm"|"success"|"error";
  toast: string; busyKeys: string[]; error: string; accountFetchState: Partial<Record<Resource,FetchStatus>>;
  wardFetchState: Record<string,FetchStatus>;
}
export const recipientEmpty: Recipient = {name:"",phone:"",city:"",ward:"",detail:"",address:"",note:""};
export const initialData: CatalogData = {
  products:[],categories:[],provinces:[],wards:{},orders:[],addresses:[],
  profile:{name:"",phone:"",email:""},authenticated:false,hasCSA:false,csa:null,rewards:null,referrals:null
};
function defaultDate(days:number) {
  const d=new Date(); d.setDate(d.getDate()-days);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
export const initialUI: UIState = {
  page:"home",productId:"",accountTab:"orders",accountHubOpen:false,locale:"vi",query:"",sort:"featured",
  selectedCategoryId:null,expandedCategoryIds:[],csaOnly:false,priceBand:"all",
  cart:{},cartOpen:false,filterOpen:false,categoryOpen:false,detailQty:1,checkoutStep:0,
  checkoutEditRecipient:false,checkoutEditFromReview:false,recipient:recipientEmpty,
  couponDraft:"",couponCode:"",couponAmount:0,couponError:"",applyCSA:{},
  orderSearch:"",orderStatus:"all",orderStart:defaultDate(29),orderEnd:defaultDate(0),orderDateOpen:false,
  visible:{},profileEditing:false,addressEditing:false,referrerDraft:"",referrerError:"",giftId:null,giftPhase:"confirm",
  toast:"",busyKeys:[],error:"",accountFetchState:{},wardFetchState:{}
};
