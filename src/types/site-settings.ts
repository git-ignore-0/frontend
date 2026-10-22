/** Public contact and social settings, shared between Home and About. */
export interface PublicSiteSettings {
  email:string;
  is_email_enabled:boolean;
  phone_display:string;
  is_phone_enabled:boolean;
  links:Array<{kind:string;url:string}>;
}
