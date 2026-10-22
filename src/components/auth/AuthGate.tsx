"use client";

import type {ReactNode} from "react";
import {useAuth} from "@/auth/AuthProvider";
import {DataState} from "@/components/UI";
import {useNFV} from "@/state/NFVContext";
import {AuthEntry} from "./AuthEntry";

/** Protects private screens while allowing guests to choose external sign-in/sign-up. */
export function AuthGate({children}:{children:ReactNode}){
  const auth=useAuth();
  const {ui}=useNFV();
  const english=ui.locale==="en";

  if(auth.status==="authenticated")return <>{children}</>;
  if(auth.status==="guest"||auth.status==="expired")return <AuthEntry locale={ui.locale} expired={auth.status==="expired"}/>;
  if(auth.status==="error")return <main className="main-content"><div className="container nfv-auth-feedback">
    <DataState kind="error" title={english?"Could not verify your session":"Không thể kiểm tra phiên đăng nhập"}
      description={auth.error} action={{label:english?"Retry":"Thử lại",onClick:()=>void auth.refresh()}}/>
  </div></main>;
  return <main className="main-content"><div className="container nfv-auth-feedback">
    <DataState kind="loading" title={english?"Checking your account…":"Đang kiểm tra tài khoản…"}/>
  </div></main>;
}
