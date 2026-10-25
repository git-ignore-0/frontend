import type {Metadata} from "next";
import {SITE_ORIGIN} from "../config/site-brand.ts";
import type {Locale} from "../types.ts";
import type {PublicWorkshop} from "../types/workshop.ts";
import type {StoreProductDetail,StoreLocale} from "../store/store-model.ts";

export type PublicMetadataPage="home"|"about"|"plants"|"animals"|"workshops"|"tracker"|"testimonials"|"store"|"csa";

const PATHS:Record<PublicMetadataPage,string>={
  home:"",about:"/about",plants:"/plants",animals:"/animals",workshops:"/workshops",
  tracker:"/tracker",testimonials:"/testimonials",store:"/store",csa:"/csa",
};

const COPY:Record<PublicMetadataPage,Record<Locale,{title:string;description:string}>>={
  home:{
    vi:{title:"Natural Farming Vietnam",description:"Kiến thức và nông sản thuận tự nhiên, bắt đầu từ đất sống và cộng đồng nông nghiệp Việt Nam."},
    en:{title:"Natural Farming Vietnam",description:"Natural farming knowledge and produce rooted in living soil and Vietnamese farming communities."},
  },
  about:{
    vi:{title:"Về chúng tôi | Natural Farming Vietnam",description:"Khám phá cách Natural Farming Vietnam nuôi dưỡng đất và sự sống bằng quan sát, nguồn lực bản địa và thực hành chung."},
    en:{title:"About us | Natural Farming Vietnam",description:"Discover how Natural Farming Vietnam uses careful observation, local resources and shared practice to nourish land and life."},
  },
  plants:{
    vi:{title:"Cây trồng | Natural Farming Vietnam",description:"Tìm hiểu sức khỏe cây trồng từ đất sống, hữu cơ, rễ và hệ vi sinh vật."},
    en:{title:"Plants | Natural Farming Vietnam",description:"Explore plant health through living soil, organic matter, roots and microorganisms."},
  },
  animals:{
    vi:{title:"Vật nuôi | Natural Farming Vietnam",description:"Tìm hiểu môi trường chăn nuôi tôn trọng tập tính tự nhiên, nền lót và nhịp chăm sóc vật nuôi."},
    en:{title:"Animals | Natural Farming Vietnam",description:"Explore animal care shaped around natural behaviour, living bedding and attentive husbandry."},
  },
  workshops:{
    vi:{title:"Workshop | Natural Farming Vietnam",description:"Gặp gỡ, quan sát và thực hành Natural Farming trong bối cảnh địa phương."},
    en:{title:"Workshops | Natural Farming Vietnam",description:"Meet, observe and practise Natural Farming in its local context."},
  },
  tracker:{
    vi:{title:"Theo dõi nông trại | Natural Farming Vietnam",description:"Theo dõi các nông trại, người nông dân và hành trình canh tác thuận tự nhiên."},
    en:{title:"Farm tracker | Natural Farming Vietnam",description:"Follow farms, farmers and their natural farming journeys."},
  },
  testimonials:{
    vi:{title:"Câu chuyện cộng đồng | Natural Farming Vietnam",description:"Lắng nghe câu chuyện từ khách hàng và người nông dân trong cộng đồng Natural Farming Vietnam."},
    en:{title:"Community stories | Natural Farming Vietnam",description:"Hear stories from customers and farmers in the Natural Farming Vietnam community."},
  },
  store:{
    vi:{title:"Cửa hàng | Natural Farming Vietnam",description:"Khám phá nông sản tươi, thông tin rõ ràng từ các nông trại Natural Farming Vietnam."},
    en:{title:"Store | Natural Farming Vietnam",description:"Explore fresh produce with clear information from Natural Farming Vietnam farms."},
  },
  csa:{
    vi:{title:"Chương trình CSA | Natural Farming Vietnam",description:"Tìm hiểu chương trình CSA kết nối gia đình với nông trại và mùa vụ thuận tự nhiên."},
    en:{title:"CSA program | Natural Farming Vietnam",description:"Explore a CSA program connecting households with farms and naturally grown seasonal produce."},
  },
};

function localizedPath(page:PublicMetadataPage,locale:Locale):string{return `${PATHS[page]}/${locale}`;}
function absolute(path:string):string{return `${SITE_ORIGIN}${path}`;}
function languageAlternates(page:PublicMetadataPage){
  return {vi:absolute(localizedPath(page,"vi")),en:absolute(localizedPath(page,"en")),"x-default":absolute(localizedPath(page,"vi"))};
}

export function publicPageMetadata(page:PublicMetadataPage,locale:Locale):Metadata{
  const copy=COPY[page][locale];
  const url=absolute(localizedPath(page,locale));
  return {
    title:copy.title,
    description:copy.description,
    alternates:{canonical:url,languages:languageAlternates(page)},
    openGraph:{title:copy.title,description:copy.description,url,type:"website",siteName:"Natural Farming Vietnam",locale:locale==="vi"?"vi_VN":"en_US",alternateLocale:[locale==="vi"?"en_US":"vi_VN"]},
  };
}

type WorkshopMetadataSource=Pick<PublicWorkshop,"slug"|"title"|"summary"|"is_fallback"|"content_locale"|"available_locales">;

export function workshopPageMetadata(workshop:WorkshopMetadataSource,requestedLocale:Locale):Metadata{
  const canonicalLocale=workshop.content_locale||requestedLocale;
  const slug=encodeURIComponent(workshop.slug);
  const url=absolute(`/workshops/${slug}/${canonicalLocale}`);
  const available=workshop.available_locales?.length?workshop.available_locales:[canonicalLocale];
  const languages:Record<string,string>=Object.fromEntries(available.map(locale=>[locale,absolute(`/workshops/${slug}/${locale}`)]));
  languages["x-default"]=url;
  return {
    title:`${workshop.title} | Natural Farming Vietnam`,
    description:workshop.summary,
    robots:workshop.is_fallback?{index:false,follow:true}:undefined,
    alternates:{canonical:url,languages},
    openGraph:{title:workshop.title,description:workshop.summary,url,type:"article",siteName:"Natural Farming Vietnam",locale:canonicalLocale==="vi"?"vi_VN":"en_US",alternateLocale:[canonicalLocale==="vi"?"en_US":"vi_VN"]},
  };
}

export function storeProductMetadata(product:StoreProductDetail,requestedLocale:StoreLocale):Metadata{
  const canonicalLocale=product.content_locale||requestedLocale;
  const slug=encodeURIComponent(product.slug);
  const canonical=absolute(`/store/${slug}/${canonicalLocale}`);
  const available=product.available_locales.length?product.available_locales:[canonicalLocale];
  const languages:Record<string,string>=Object.fromEntries(available.map(locale=>[locale,absolute(`/store/${slug}/${locale}`)]));
  languages["x-default"]=canonical;
  const title=`${product.name} | Natural Farming Vietnam`;
  const description=product.short_description||`${product.name} · ${product.category.name}`;
  return {
    title,description,
    robots:product.is_fallback?{index:false,follow:true}:undefined,
    alternates:{canonical,languages},
    openGraph:{title:product.name,description,url:canonical,type:"website",siteName:"Natural Farming Vietnam",locale:canonicalLocale==="vi"?"vi_VN":"en_US",alternateLocale:[canonicalLocale==="vi"?"en_US":"vi_VN"],images:product.primary_image?[{url:product.primary_image.url,width:product.primary_image.width,height:product.primary_image.height,alt:product.name}]:undefined},
  };
}
