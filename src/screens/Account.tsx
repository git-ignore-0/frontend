"use client";

import {useEffect, useRef} from "react";
import {Icon} from "@/components/UI";
import {ACCOUNT_GROUPS,ACCOUNT_NAV,type AccountNavItem} from "@/data/account-navigation";
import {copyText} from "@/data/account-copy";
import {useNFV} from "@/state/NFVContext";
import type {AccountTab} from "@/types";
import {OrdersView} from "@/screens/AccountOrders";
import {AddressView, ProfileView} from "@/screens/AccountProfile";
import {BenefitsView} from "@/screens/AccountBenefits";
import {LogoutButton} from "@/components/auth/LogoutButton";

export function Account() {
  const {ui, patch} = useNFV();
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
      hubLinkRefs.current[ui.accountTab]?.focus();
      nextFocus.current=null;
    }
  },[ui.accountHubOpen,ui.accountTab]);
  const translate = (key: string) => copyText(ui.locale, key);

  const selectTab = (tab: AccountTab) => {
    nextFocus.current="detail";
    patch({accountTab: tab, accountHubOpen: false, error: ""});
  };

  const renderHubLink = ({id,icon}: AccountNavItem) => (
      <button className="acc-hub-link" key={id} ref={node => {hubLinkRefs.current[id]=node;}} onClick={() => selectTab(id)}>
        <span className="acc-hub-ico"><Icon name={icon} size={18}/></span>
        <span className="copy">
          <strong>{translate(`nav.${id}`)}</strong>
          <small>{translate(`navDesc.${id}`)}</small>
        </span>
        <span className="acc-hub-chevron"><Icon name="chev" size={15}/></span>
      </button>
  );

  return (
    <main className="main-content">
      <div className="container">
        {ui.accountHubOpen ? (
          <div className="account-mobile-head account-mobile-overview-head">
            <h1>{translate("account.titleMobile")}</h1>
          </div>
        ) : (
          <div className="account-mobile-head">
            <button className="account-mobile-back" onClick={() => {nextFocus.current="hub";patch({accountHubOpen: true});}}>
              <Icon name="back" size={16}/> {translate("account.titleMobile")}
            </button>
            <h1 ref={headingRef} tabIndex={-1}>{translate(`nav.${ui.accountTab}`)}</h1>
            {ACCOUNT_NAV.some(entry => entry.id === ui.accountTab && entry.hasDescription) && (
              <p className="acc-page-subtitle">{translate(`navDesc.${ui.accountTab}`)}</p>
            )}
          </div>
        )}

        {ui.accountHubOpen && (
          <div className="account-mobile-hub">
            {ACCOUNT_GROUPS.map(group => (
              <section className="acc-hub-group" key={group}>
                <div className="acc-hub-group-head"><h2>{translate(group)}</h2></div>
                <div className="acc-hub-links">
                  {ACCOUNT_NAV.filter(item => item.group === group).map(renderHubLink)}
                </div>
              </section>
            ))}
          </div>
        )}
        {ui.accountHubOpen&&<div className="account-mobile-logout"><LogoutButton variant="hub"/></div>}

        <div className={`account-layout account-tab-${ui.accountTab}${ui.accountHubOpen ? " mobile-hub" : ""}`}>
          <div className="account-nav-shell">
            <aside className="account-side" id="nfv-account-tabs" aria-label={translate("account.title")}>
              <div className="account-nav-label">{translate("account.title")}</div>
              {ACCOUNT_NAV.map(({id, icon}) => (
                <button
                  key={id}
                  className={`account-link${ui.accountTab === id ? " active" : ""}`}
                  aria-pressed={ui.accountTab === id}
                  onClick={() => selectTab(id)}
                >
                  <Icon name={icon} size={17}/>
                  <span>{translate(`nav.${id}`)}</span>
                  {ui.accountTab === id && <Icon name="chev" size={13}/>}
                </button>
              ))}
              <LogoutButton variant="sidebar"/>
            </aside>
          </div>
          <div className="account-content">
            {ui.accountTab === "orders" ? <OrdersView/>
              : ui.accountTab === "address" ? <AddressView/>
              : ui.accountTab === "profile" ? <ProfileView/>
              : <BenefitsView kind={ui.accountTab}/>}
          </div>
        </div>
      </div>
    </main>
  );
}
