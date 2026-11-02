import {notFound} from "next/navigation";
import {NFVApp} from "../../../../NFVApp";
import {StoreOrderDetail} from "@/screens/store/StoreOrderDetail";
import type {Locale} from "@/types";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const metadata={robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{id:string;locale:string}>;searchParams?:Promise<{from?:string|string[]}>}){const [{id,locale},query]=await Promise.all([params,searchParams]);if(!UUID.test(id)||(locale!=="vi"&&locale!=="en"))notFound();return <NFVApp initialPage="order-detail" initialLocale={locale as Locale}><main className="main-content"><StoreOrderDetail id={id} locale={locale as Locale} returnTo={query?.from==="csa"?"csa":"orders"}/></main></NFVApp>}
