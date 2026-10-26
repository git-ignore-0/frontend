"use client";

import {useEffect, useRef, useState} from "react";
import {DataState, Icon, Section} from "@/components/UI";
import {ACCOUNT_GROUPS,accountNavigationFor,accountPersistentTabs,accountTabForAuth,type AccountNavItem} from "@/data/account-navigation";
import {copyText} from "@/data/account-copy";
import {useNFV} from "@/state/NFVContext";
import {useAuth} from "@/auth/AuthProvider";
import type {AccountTab} from "@/types";
import {OrdersView} from "@/screens/AccountOrders";
import {AddressView, ProfileView} from "@/screens/AccountProfile";
import {BenefitsView} from "@/screens/AccountBenefits";
import {LogoutButton} from "@/components/auth/LogoutButton";
import {GuestAuthActions} from "@/components/auth/GuestAuthActions";
import {AccountCsaPackageSelection} from "@/screens/account-csa/AccountCsaPackageSelection";
import {AccountCsaTracker} from "@/screens/account-csa/AccountCsaTracker";

export function Account() {
  const {ui, patch} = useNFV();
  const auth=useAuth();
  const navigation=accountNavigationFor(auth.status);
  const activeTab=accountTabForAuth(ui.accountTab,auth.status);
  const authenticated=auth.status==="authenticated";
  const [persistentTabs,setPersistentTabs]=useState<ReadonlyArray<AccountTab>>(()=>accountPersistentTabs([],activeTab));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hubLinkRefs = useRef<Partial<Record<AccountTab,HTMLButtonElement|null>>>({});
  const nextFocus = useRef<"detail"|"hub"|null>(null);

  useEffect(()=>{
    if(!nextFocus.current)return;
    if(!window.matchMedia("(max-width: 1023px)").matches){nextFocus.current=null;return;}
    if(nextFocus.current==="detail" && !ui.accountHubOpen){
      headingRef.current?.focus();
      nextFocus.current=null;
    } else if(nextFocus.current==="hub" && ui.accountHubOpen){
      hubLinkRefs.current[activeTab]?.focus();
      nextFocus.current=null;
    }
  },[activeTab,ui.accountHubOpen]);
  useEffect(()=>{
    if(auth.status==="checking")return;
    const nextTab=activeTab;
    if(nextTab!==ui.accountTab)patch({accountTab:nextTab,accountHubOpen:true,error:""});
  },[activeTab,auth.status,patch,ui.accountTab]);
  const translate = (key: string) => copyText(ui.locale, key);

  if(auth.status==="checking")return <main className="main-content"><div className="container nfv-auth-feedback"><DataState kind="loading" title={translate("account.checking")}/></div></main>;
  if(auth.status==="error")return <main className="main-content"><div className="container nfv-auth-feedback"><DataState kind="error" title={translate("state.failedTitle")} description={auth.error} action={{label:translate("common.retry"),onClick:()=>void auth.refresh()}}/></div></main>;

  const selectTab = (tab: AccountTab) => {
    nextFocus.current="detail";
    setPersistentTabs(current=>accountPersistentTabs(accountPersistentTabs(current,activeTab),tab));
    patch({accountTab: tab, accountHubOpen: false, error: ""});
  };

  const renderHubLink = ({id,icon,labelKey,descriptionKey}: AccountNavItem) => (
      <button className="acc-hub-link" key={id} ref={node => {hubLinkRefs.current[id]=node;}} onClick={() => selectTab(id)}>
        <span className="acc-hub-ico"><Icon name={icon} size={18}/></span>
        <span className="copy">
          <strong>{translate(labelKey||`nav.${id}`)}</strong>
          <small>{translate(descriptionKey||`navDesc.${id}`)}</small>
        </span>
        <span className="acc-hub-chevron"><Icon name="chev" size={15}/></span>
      </button>
  );
  const guestNotice = (placement:"hub"|"content") => !authenticated&&<Section title={translate("guestAccount.noticeTitle")} className={`account-guest-notice account-guest-notice--${placement}`}>
    <p>{translate("guestAccount.noticeBody")}</p>
    <GuestAuthActions locale={ui.locale}/>
  </Section>;
  const renderTab = (tab:AccountTab) => {
    if(!authenticated){
      if(tab==="csa")return <AccountCsaPackageSelection/>;
      if(tab==="csa-tracker")return <AccountCsaTracker/>;
      return null;
    }
    if(tab==="orders")return <OrdersView/>;
    if(tab==="address")return <AddressView/>;
    if(tab==="profile")return <ProfileView/>;
    if(tab==="csa-tracker")return null;
    return <BenefitsView kind={tab}/>;
  };
  const renderedTabs=accountPersistentTabs(persistentTabs,activeTab);

  return (
    <main className="main-content">
      <div className="container">
        {ui.accountHubOpen ? (
          <div className="account-mobile-head account-mobile-overview-head">
            <h1>{translate(authenticated?"account.titleMobile":"guestAccount.titleMobile")}</h1>
          </div>
        ) : (
          <div className="account-mobile-head">
            <button className="account-mobile-back" onClick={() => {nextFocus.current="hub";patch({accountHubOpen: true});}}>
              <Icon name="back" size={16}/> {translate(authenticated?"account.titleMobile":"guestAccount.titleMobile")}
            </button>
            <h1 ref={headingRef} tabIndex={-1}>{translate(navigation.find(entry=>entry.id===activeTab)?.labelKey||`nav.${activeTab}`)}</h1>
            {navigation.some(entry => entry.id === activeTab && entry.hasDescription) && (
              <p className="acc-page-subtitle">{translate(navigation.find(entry=>entry.id===activeTab)?.descriptionKey||`navDesc.${activeTab}`)}</p>
            )}
          </div>
        )}

        {ui.accountHubOpen && authenticated && (
          <div className="account-mobile-hub">
            {ACCOUNT_GROUPS.map(group => (
              <section className="acc-hub-group" key={group}>
                <div className="acc-hub-group-head"><h2>{translate(group)}</h2></div>
                <div className="acc-hub-links">
                  {navigation.filter(item => item.group === group).map(renderHubLink)}
                </div>
              </section>
            ))}
          </div>
        )}
        {ui.accountHubOpen&&!authenticated&&<div className="account-mobile-hub">{guestNotice("hub")}<div className="acc-hub-links">{navigation.map(renderHubLink)}</div></div>}
        {ui.accountHubOpen&&auth.status==="authenticated"&&<div className="account-mobile-logout"><LogoutButton variant="hub"/></div>}

        <div className={`account-layout account-tab-${activeTab}${ui.accountHubOpen ? " mobile-hub" : ""}`}>
          <div className="account-nav-shell">
            <aside className="account-side" id="nfv-account-tabs" aria-label={translate(authenticated?"account.title":"guestAccount.title")}>
              <div className="account-nav-label">{translate(authenticated?"account.title":"guestAccount.title")}</div>
              {navigation.map(({id, icon,labelKey}) => (
                <button
                  key={id}
                  className={`account-link${activeTab === id ? " active" : ""}`}
                  aria-pressed={activeTab === id}
                  onClick={() => selectTab(id)}
                >
                  <Icon name={icon} size={17}/>
                  <span>{translate(labelKey||`nav.${id}`)}</span>
                  {activeTab === id && <Icon name="chev" size={13}/>}
                </button>
              ))}
              {auth.status==="authenticated"&&<LogoutButton variant="sidebar"/>}
            </aside>
          </div>
          <div className="account-content">
            {guestNotice("content")}
            {renderedTabs.map(tab=>{
              const content=renderTab(tab);
              return content?<div key={`${auth.status}:${tab}`} hidden={activeTab!==tab}>{content}</div>:null;
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
