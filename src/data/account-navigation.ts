import type {AccountTab} from "@/types";
import type {AuthStatus} from "@/auth/auth-types";

type AccountGroup = "group.orders" | "group.personal" | "group.programs";

export const ACCOUNT_GROUPS: readonly AccountGroup[] = ["group.orders", "group.personal", "group.programs"];

/** One source of truth for both desktop sidebar and mobile Account Hub. */
export type AccountNavItem = Readonly<{
  id:AccountTab;
  icon:string;
  group:AccountGroup|null;
  hasDescription:boolean;
  labelKey?:string;
  descriptionKey?:string;
}>;

export const ACCOUNT_NAV: ReadonlyArray<AccountNavItem> = [
  {id:"orders",icon:"bag",group:"group.orders",hasDescription:true},
  {id:"profile",icon:"edit",group:"group.personal",hasDescription:true},
  {id:"address",icon:"pin",group:"group.personal",hasDescription:true},
  {id:"csa",icon:"leaf",group:"group.programs",hasDescription:false},
  {id:"rewards",icon:"star",group:"group.programs",hasDescription:false},
  {id:"redeem",icon:"gift",group:"group.programs",hasDescription:false},
  {id:"referrals",icon:"share",group:"group.programs",hasDescription:false},
];

export const GUEST_ACCOUNT_NAV: ReadonlyArray<AccountNavItem> = [
  {id:"csa",icon:"leaf",group:null,hasDescription:true,labelKey:"guestNav.csa",descriptionKey:"guestNavDesc.csa"},
  {id:"csa-tracker",icon:"search",group:null,hasDescription:true,labelKey:"nav.csa-tracker",descriptionKey:"navDesc.csa-tracker"},
];

export function accountNavigationFor(status:AuthStatus):ReadonlyArray<AccountNavItem>{
  if(status==="authenticated")return ACCOUNT_NAV;
  if(status==="guest"||status==="expired")return GUEST_ACCOUNT_NAV;
  return [];
}

export function accountTabForAuth(tab:AccountTab,status:AuthStatus):AccountTab{
  const navigation=accountNavigationFor(status);
  return navigation.length===0||navigation.some(item=>item.id===tab)?tab:navigation[0].id;
}

export function accountPersistentTabs(current:ReadonlyArray<AccountTab>,active:AccountTab):ReadonlyArray<AccountTab>{
  return current.includes(active)?current:[...current,active];
}
