import {notFound} from 'next/navigation';
import {NFVApp} from '../../../../NFVApp';
import {CsaRoundSelectionPage} from '@/screens/account-csa/CsaRoundSelectionPage';
import type {Locale} from '@/types';
export const metadata={robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string;locale:string}>}){
 const {id,locale}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)||(locale!=='vi'&&locale!=='en'))notFound();
 return <NFVApp initialPage="csa-round-selection" initialLocale={locale as Locale} initialAccountTab="csa"><CsaRoundSelectionPage roundId={id} locale={locale as Locale}/></NFVApp>;
}
