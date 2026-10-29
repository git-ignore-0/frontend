import {ActionLink,Icon} from "@/components/UI";
import {copyText} from "@/data/account-copy";
import {csaLandingHref} from "@/lib/csa-navigation";
import type {Locale} from "@/types";
import {AccountCsaTracker} from "@/screens/account-csa/AccountCsaTracker";

export function CsaTrackerPublicPage({locale}:{locale:Locale}){
  return <main id="main-content" className="main-content csa-public-flow csa-tracker-public-page account-tab-csa-tracker"><div className="container csa-public-flow-shell"><div className="csa-public-flow-head"><ActionLink variant="plain" href={csaLandingHref(locale)}><Icon name="back" size={16}/>{copyText(locale,"csa.backToProgram")}</ActionLink><h1>{copyText(locale,"csa.trackerTitle")}</h1></div><AccountCsaTracker/></div></main>;
}
