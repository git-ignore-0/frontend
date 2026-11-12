import {ACCOUNT_NAV} from '../data/account-navigation.ts';
import type {AccountTab, Locale} from '../types.ts';

type AccountLocation = {pathname: string; search?: string; hash?: string};
type AccountBrowser = {
  location: AccountLocation;
  history: {state: unknown; pushState: (state: unknown, unused: string, href: string) => void; replaceState: (state: unknown, unused: string, href: string) => void};
};

/** Tabs are views of one Account document; public page navigation remains unchanged. */
export function accountRouteState(location: AccountLocation): {accountTab: AccountTab; accountHubOpen: boolean} | null {
  if (!/^\/account\/(vi|en)\/?$/.test(location.pathname)) return null;
  const tabs = new URLSearchParams(location.search ?? '').getAll('tab');
  const tab = tabs.length === 1 ? ACCOUNT_NAV.find(item => item.id === tabs[0])?.id : undefined;
  return {accountTab: tab ?? 'orders', accountHubOpen: !tab};
}

export function syncAccountRoute(browser: AccountBrowser, locale: Locale, tab: AccountTab | null, replace = false): void {
  const query = new URLSearchParams(browser.location.search ?? '');
  if (tab) query.set('tab', tab);
  else query.delete('tab');
  const search = query.toString();
  const href = `/account/${locale}${search ? `?${search}` : ''}`;
  const current = `${browser.location.pathname}${browser.location.search ?? ''}${browser.location.hash ?? ''}`;
  if (href === current) return;
  const method = replace ? 'replaceState' : 'pushState';
  browser.history[method](browser.history.state, '', href);
}
