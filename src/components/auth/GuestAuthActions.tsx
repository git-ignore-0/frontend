import type {Locale} from "@/types";
import {siteAuthHref} from "@/auth/site-auth";

/** Shared native links: OAuth must navigate, not execute a frontend form. */
export function GuestAuthActions({locale,variant="entry"}:{locale:Locale;variant?:"entry"|"drawer"}){
  return <div className={`nfv-auth-actions nfv-auth-actions--${variant}`}>
    <a className="btn" href={siteAuthHref("login",locale)}>{locale==="vi"?"Đăng nhập":"Sign in"}</a>
    <a className="btn btn-outline" href={siteAuthHref("register",locale)}>{locale==="vi"?"Đăng ký":"Register"}</a>
  </div>;
}
