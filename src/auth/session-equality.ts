import type {Session} from "@/types";

export function sameAuthSession(left:Session|null,right:Session|null):boolean{
  if(left===right)return true;
  if(!left||!right)return false;
  return left.authenticated===right.authenticated&&left.subject===right.subject&&left.hasCSA===right.hasCSA&&
    left.profile?.name===right.profile?.name&&left.profile?.email===right.profile?.email&&
    left.profile?.phone===right.profile?.phone&&left.profile?.dateOfBirth===right.profile?.dateOfBirth;
}
