"use client";

import {Icon} from "@/components/UI";
import {useNFV} from "@/state/NFVContext";
import {siteLogoutHref,externalSiteAccountHref} from "@/auth/site-auth";
import {copyText} from "@/data/account-copy";

type Props={variant:"sidebar"|"hub"};

/** Same-origin POST is required by the site's logout Origin/CSRF check. */
export function LogoutButton({variant}:Props){
  const {ui}=useNFV();
  const external=externalSiteAccountHref(ui.locale);
  const content=<>
    <span className="account-logout-icon"><Icon name="log-out" size={18}/></span>
    <span>{external?(ui.locale==="vi"?"Quản lý đăng xuất":"Manage sign-out"):copyText(ui.locale,"account.logout")}</span>
  </>;

  return <div className={`account-logout account-logout--${variant}`}>
    {external ? <a href={external} className="account-logout-button">{content}</a> :
      <form method="post" action={siteLogoutHref(ui.locale)}>
        <button type="submit" className="account-logout-button">{content}</button>
      </form>}
  </div>;
}
