import type {AccountTab} from "@/types";

type AccountGroup = "group.orders" | "group.personal" | "group.programs";

export const ACCOUNT_GROUPS: readonly AccountGroup[] = ["group.orders", "group.personal", "group.programs"];

/** One source of truth for both desktop sidebar and mobile Account Hub. */
export type AccountNavItem = Readonly<{
  id:AccountTab;
  icon:string;
  group:AccountGroup;
  hasDescription:boolean;
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
