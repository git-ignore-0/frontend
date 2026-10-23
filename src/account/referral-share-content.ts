import type {Locale} from "@/types";

const COPY:Record<Locale,{
  eyebrow:string;title:string;description:string;cta:string;visualNote:string;imageAlt:string;
}>={
  vi:{
    eyebrow:"Bạn được mời khám phá",
    title:"Nông sản thuận tự nhiên, sẻ chia bằng sự quan tâm.",
    description:"Khám phá nông sản được canh tác tự nhiên từ Natural Farming Vietnam, nơi mỗi lần mua hàng góp phần hỗ trợ và đào tạo thế hệ nông dân Việt Nam tiếp theo.",
    cta:"Khám phá Natural Farming Vietnam",
    visualNote:"Đất sống · Canh tác tự nhiên",
    imageAlt:"Ảnh xem trước lời mời Natural Farming Vietnam",
  },
  en:{
    eyebrow:"You’ve been invited",
    title:"Naturally grown food, shared with care.",
    description:"Discover naturally grown food from Natural Farming Vietnam, where every purchase helps support and train the next generation of Vietnamese farmers.",
    cta:"Explore Natural Farming Vietnam",
    visualNote:"Living soil · Naturally grown",
    imageAlt:"Natural Farming Vietnam invitation preview",
  },
};

export function referralShareContent(locale:Locale){return COPY[locale];}
