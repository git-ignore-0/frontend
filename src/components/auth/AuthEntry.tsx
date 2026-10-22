import type {Locale} from "@/types";
import {Icon} from "@/components/UI";
import {GuestAuthActions} from "./GuestAuthActions";

/** Lightweight guest state: no duplicate login/register forms in the app. */
export function AuthEntry({locale,expired=false}:{locale:Locale;expired?:boolean}){
  return <main className="main-content nfv-auth-page"><div className="container">
    <section className="nfv-auth-card" aria-labelledby="nfv-auth-heading">
      <div className="nfv-auth-mark"><Icon name="user" size={23}/></div>
      <h1 id="nfv-auth-heading">{locale==="vi"?"Tài khoản NFV":"NFV account"}</h1>
      {expired&&<p className="nfv-auth-notice" role="status">{locale==="vi"?"Phiên đăng nhập đã hết hạn.":"Your session has expired."}</p>}
      <p className="nfv-auth-intro">{locale==="vi"?"Đăng nhập hoặc đăng ký bằng hệ thống tài khoản NFV.":"Sign in or register using your NFV account."}</p>
      <GuestAuthActions locale={locale}/>
    </section>
  </div></main>;
}
