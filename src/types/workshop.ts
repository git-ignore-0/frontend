export type WorkshopStatus="upcoming"|"ongoing"|"completed";
export interface PublicWorkshop {
  id:string;slug:string;title:string;summary:string;start_at:string;end_at:string;
  event_timezone:string;status:WorkshopStatus;is_fallback:boolean;
  requested_locale?:"vi"|"en";content_locale?:"vi"|"en";default_locale?:"vi"|"en";
  available_locales?:Array<"vi"|"en">;registration_url?:string|null;
  body?:Record<string,unknown>;
}
export type WorkshopCollection={upcoming:PublicWorkshop[];past:PublicWorkshop[]};
