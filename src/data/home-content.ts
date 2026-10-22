import type {Locale} from "@/types";

/** Source: frontendv2/src/content/site-content.ts (home), copied without changing its copy. */
export type HomeCopy = {
  heroEyebrow:string; systemsEyebrow:string; pillarsEyebrow:string;
  plantLabel:string; animalLabel:string; communityLabel:string;
  storeEyebrow:string; contactEyebrow:string; title:string; intro:string;
  heroAlt:string; primary:string; secondary:string; what:string; whatBody:string;
  principles: readonly (readonly [string,string])[]; pillars:string;
  plantTitle:string; plantBody:string; plantCta:string;
  animalTitle:string; animalBody:string; animalCta:string;
  peopleTitle:string; peopleBody:string; peopleCta:string;
  storeTitle:string; storeBody:string; storeCta:string;
  contactTitle:string; contactBody:string;
};
export const HOME_COPY:Record<Locale,HomeCopy> = {
  en:{
    heroEyebrow:"Living Soil · From soil, life begins",
    systemsEyebrow:"01 · Living systems",pillarsEyebrow:"02 · Soil to community",
    plantLabel:"Plants",animalLabel:"Animals",communityLabel:"Community",
    storeEyebrow:"03 · Farmbrite",contactEyebrow:"04 · Connect",
    title:"Life begins in living soil.",
    intro:"Natural Farming works with local ecosystems to nurture soil, resilient plants, healthy animals and farming communities.",
    heroAlt:"Aerial view of the tropical Natural Farming Vietnam farm",
    primary:"Discover our approach",secondary:"Explore the knowledge",what:"What is Natural Farming?",
    whatBody:"A way of observing and cultivating that begins with the relationships already present in a place: soil structure, organic matter, roots, microorganisms, animals and people.",
    principles:[
      ["Nurture soil life","Build the conditions for roots and soil organisms to work together."],
      ["Use local resources","Return suitable farm materials to useful biological cycles."],
      ["Reduce dependency","Learn to make careful decisions with fewer external inputs."],
      ["Observe before acting","Start small, read changes and adapt to the local context."]
    ],
    pillars:"One farm, connected lives.",
    plantTitle:"Plants begin below ground",plantBody:"Explore soil, microorganisms and the inputs commonly discussed in Natural Farming.",plantCta:"Explore plants",
    animalTitle:"Care shaped by natural behavior",animalBody:"Learn how housing, bedding, feed and observation support animal wellbeing.",animalCta:"Explore animals",
    peopleTitle:"Knowledge grows between people",peopleBody:"Natural Farming Vietnam connects practical observation with shared learning.",peopleCta:"Meet the project",
    storeTitle:"The store lives somewhere else.",storeBody:"Products, prices and checkout are handled by our dedicated Farmbrite store. This website stays focused on the project and its knowledge.",storeCta:"Visit the store",
    contactTitle:"Let’s grow knowledge together.",contactBody:"Connect with the project about learning, collaboration or applying Natural Farming in your context."
  },
  vi:{
    heroEyebrow:"Đất sống · Từ đất, sự sống bắt đầu",
    systemsEyebrow:"01 · Hệ sống",pillarsEyebrow:"02 · Từ đất đến cộng đồng",
    plantLabel:"Cây trồng",animalLabel:"Vật nuôi",communityLabel:"Cộng đồng",
    storeEyebrow:"03 · Farmbrite",contactEyebrow:"04 · Kết nối",
    title:"Sự sống bắt đầu từ đất sống.",
    intro:"Nông nghiệp tự nhiên cùng hệ sinh thái bản địa nuôi dưỡng đất, cây trồng bền bỉ, vật nuôi khỏe mạnh và cộng đồng nông nghiệp.",
    heroAlt:"Toàn cảnh trên cao của nông trại nhiệt đới Natural Farming Vietnam",
    primary:"Khám phá cách tiếp cận",secondary:"Khám phá kho kiến thức",what:"Natural Farming là gì?",
    whatBody:"Một cách quan sát và canh tác bắt đầu từ các mối quan hệ đã có ở mỗi nơi: cấu trúc đất, vật liệu hữu cơ, rễ, vi sinh vật, vật nuôi và con người.",
    principles:[
      ["Nuôi dưỡng sự sống trong đất","Tạo điều kiện để rễ cây và sinh vật đất cùng làm việc."],
      ["Dùng nguồn lực bản địa","Đưa vật liệu phù hợp tại nông trại trở lại các vòng tuần hoàn sinh học."],
      ["Giảm sự phụ thuộc","Học cách đưa ra quyết định thận trọng với ít đầu vào bên ngoài hơn."],
      ["Quan sát trước khi hành động","Bắt đầu nhỏ, đọc thay đổi và thích nghi với bối cảnh địa phương."]
    ],
    pillars:"Một nông trại, những sự sống kết nối.",
    plantTitle:"Cây bắt đầu từ dưới mặt đất",plantBody:"Khám phá đất, vi sinh vật và các đầu vào thường gặp trong Natural Farming.",plantCta:"Khám phá cây trồng",
    animalTitle:"Chăm sóc theo tập tính tự nhiên",animalBody:"Tìm hiểu cách chuồng trại, nền lót, thức ăn và quan sát hỗ trợ phúc lợi vật nuôi.",animalCta:"Khám phá vật nuôi",
    peopleTitle:"Kiến thức lớn lên giữa con người",peopleBody:"Natural Farming Vietnam kết nối quan sát thực hành với việc học hỏi cùng nhau.",peopleCta:"Tìm hiểu dự án",
    storeTitle:"Cửa hàng ở một không gian riêng.",storeBody:"Sản phẩm, giá và thanh toán được xử lý tại cửa hàng Farmbrite. Website này tập trung vào dự án và kiến thức.",storeCta:"Đến cửa hàng",
    contactTitle:"Cùng nhau nuôi lớn tri thức.",contactBody:"Kết nối với dự án về học tập, hợp tác hoặc áp dụng Natural Farming trong bối cảnh của bạn."
  }
} as const;
