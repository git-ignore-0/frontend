"use client";
import {createContext,useMemo,type ReactNode} from "react";
import type {Locale} from "@/types";
import type {PublicSiteSettings} from "@/types/site-settings";

export type InitialSiteSettings={locale:Locale;settings:PublicSiteSettings|null};

export const SiteSettingsContext=createContext<InitialSiteSettings|undefined>(undefined);

/** Keeps server-fetched settings request-local while producing identical SSR and hydration markup. */
export function SiteSettingsProvider({locale,settings,children}:{locale:Locale;settings:PublicSiteSettings|null;children:ReactNode}){
  const value=useMemo(()=>({locale,settings}),[locale,settings]);
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}
