import type {Session} from "@/types";

export type AuthStatus = "checking" | "guest" | "authenticated" | "expired" | "error";
export type AuthSnapshot = {status:AuthStatus;session:Session|null;error:string};
