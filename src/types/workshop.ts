export type WorkshopStatus="upcoming"|"ongoing"|"completed";
export interface PublicWorkshop {
  id:string;slug:string;title:string;summary:string;start_at:string;end_at:string;
  event_timezone:string;status:WorkshopStatus;is_fallback?:boolean;
}
export type WorkshopCollection={upcoming:PublicWorkshop[];past:PublicWorkshop[]};
