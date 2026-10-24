import {NextResponse,type NextRequest} from "next/server";
import {requestLocale} from "@/lib/request-locale";

const LOCALE_HEADER="x-nfv-locale";

/** Forward a server-owned locale header so RootLayout can emit the correct document language. */
export function proxy(request:NextRequest){
  const requestHeaders=new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER,requestLocale(request.nextUrl));
  return NextResponse.next({request:{headers:requestHeaders}});
}

export const config={
  matcher:["/((?!api|_next/static|_next/image|favicon.ico|icon.png|images/|robots.txt|sitemap.xml).*)"],
};
