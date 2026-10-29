import {ActionLink,Icon} from "@/components/UI";
import {copyText} from "@/data/account-copy";
import {csaLandingHref,csaTrackerHref} from "@/lib/csa-navigation";
import type {Locale} from "@/types";
import {AccountCsaPackageSelection} from "@/screens/account-csa/AccountCsaPackageSelection";

export function CsaPurchasePage({locale,initialPackageId,initialPackagePage}:{locale:Locale;initialPackageId?:string;initialPackagePage?:number}){
  return <main id="main-content" className="main-content csa-public-flow csa-purchase-page account-tab-csa"><div className="container csa-public-flow-shell"><div className="csa-public-flow-head"><ActionLink variant="plain" href={csaLandingHref(locale,"packages")}><Icon name="back" size={16}/>{copyText(locale,"csa.backToProgram")}</ActionLink><h1>{copyText(locale,"csa.selectionTitle")}</h1></div><AccountCsaPackageSelection initialPackageId={initialPackageId} initialPackagePage={initialPackagePage} trackerHref={csaTrackerHref(locale)} csaHref={csaLandingHref(locale)}/></div></main>;
}
