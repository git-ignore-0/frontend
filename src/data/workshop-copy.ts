import type {Locale} from "@/types";
/** Page and Home use the same translated workshop strings. */
export const WORKSHOP_COPY:Record<Locale,{
 title:string;intro:string;upcoming:string;past:string;emptyUpcoming:string;emptyPast:string;details:string;
 fallback:string;status:Record<"upcoming"|"ongoing"|"completed",string>;
 homeEyebrow:string;homeTitle:string;homeCta:string;count:(count:number)=>string;
 loading:string;unavailable:string;
}>={
  vi:{title:"Workshop",intro:"Gặp gỡ, quan sát và thực hành Natural Farming trong bối cảnh địa phương.",upcoming:"Lịch workshop",past:"Đã tổ chức",emptyUpcoming:"Chưa có workshop mới được công bố.",emptyPast:"Chưa có workshop đã tổ chức.",details:"Xem chi tiết",fallback:"Nội dung này hiện chỉ có bằng tiếng Anh.",status:{upcoming:"Sắp diễn ra",ongoing:"Đang diễn ra",completed:"Đã diễn ra"},homeEyebrow:"Workshop · Học cùng nhau",homeTitle:"Từ quan sát đến thực hành.",homeCta:"Xem tất cả workshop",count:(n)=>`${n} buổi`,loading:"Đang tải workshop…",unavailable:"Chưa tải được danh sách workshop. Vui lòng thử lại sau."},
  en:{title:"Workshops",intro:"Meet, observe and practise Natural Farming in its local context.",upcoming:"Workshop schedule",past:"Past workshops",emptyUpcoming:"No new workshop has been announced yet.",emptyPast:"No past workshop is available yet.",details:"View details",fallback:"This content is currently available in Vietnamese only.",status:{upcoming:"Upcoming",ongoing:"Ongoing",completed:"Completed"},homeEyebrow:"Workshops · Learn together",homeTitle:"From observation to practice.",homeCta:"View all workshops",count:(n)=>`${n} ${n===1?"workshop":"workshops"}`,loading:"Loading workshops…",unavailable:"Unable to load workshops. Please try again later."}
};
