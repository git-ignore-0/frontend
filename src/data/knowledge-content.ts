/** Editorial copy migrated from the public NFV knowledge pages. No API calls. */
import type {Locale} from "@/types";

type Copy = {
  label:string;title:string;intro:string;alt:string;toc:readonly string[];sections:readonly {index:string;title:string}[];
  paragraphs:readonly string[]; comparisonHeaders?:readonly string[];comparisonRows?:readonly (readonly string[])[];
  figureAlt:readonly string[];figureCaption?:readonly string[];
  cards?:readonly (readonly [string,string,string])[]; beddingHeaders?:readonly string[];beddingRows?:readonly (readonly string[])[];
  bulletGroups?:readonly (readonly string[])[];stageItems?:readonly string[];chickenHeaders?:readonly string[];chickenRows?:readonly (readonly string[])[];
  cta?:string; notes?:readonly string[];
};

export const PLANTS_COPY:Record<Locale,Copy> = {
  vi:{
    label:"Cây trồng",title:"Nuôi đất trước khi nuôi cây.",
    intro:"Natural Farming nhìn sức khỏe cây trồng như kết quả của một hệ sống, nơi cấu trúc, hữu cơ, rễ và vi sinh vật cùng làm việc.",
    alt:"Cây xanh tươi phát triển trong đất giàu hữu cơ",
    toc:["Một câu hỏi khác","Hệ thống canh tác","Đất sống","Chu kỳ dinh dưỡng","Chỉ mục chế phẩm","Thực hành thận trọng"],
    sections:[
      {index:"01 · Bối cảnh",title:"Một cách làm khác bắt đầu từ câu hỏi khác."},
      {index:"02 · So sánh",title:"Canh tác thông thường, hữu cơ và Natural Farming."},
      {index:"03 · Nền tảng",title:"Đất là nơi sự sống trao đổi."},
      {index:"04 · Sinh trưởng",title:"Đọc nhu cầu thay đổi của cây."},
      {index:"05 · Chỉ mục kiến thức",title:"Tám tên gọi thường gặp."},
      {index:"06 · Bước tiếp theo",title:"Bắt đầu nhỏ, ghi lại, so sánh."}
    ],
    paragraphs:[
      "Thay vì chỉ hỏi cây đang thiếu gì, Natural Farming còn hỏi điều gì đang diễn ra trong đất, nguồn lực địa phương nào đang bị bỏ qua và can thiệp nào là vừa đủ.",
      "Tài liệu cũ đặt cày xới, làm cỏ hoàn toàn và đầu vào mua ngoài cạnh giảm xáo trộn, lớp phủ sống và đầu vào tự làm. Đây là định hướng quan sát, không phải công thức chung cho mọi nơi.",
      "Rễ, khoáng, nước, không khí, vật liệu hữu cơ và sinh vật tạo nên môi trường đất. Che phủ bề mặt, hoàn trả hữu cơ phù hợp và hạn chế xáo trộn không cần thiết có thể hỗ trợ hệ này.",
      "Vi sinh vật bản địa (IMO) là nội dung trung tâm trong kho kiến thức cũ. Việc thu thập và nhân nuôi cần vệ sinh, phán đoán và học tại chỗ; không nên xem như một sản phẩm giống nhau cho mọi nơi.",
      "Tài liệu cũ tổ chức sự phát triển của cây theo sinh trưởng, chuyển tiếp, ra hoa và tạo quả. Sơ đồ khoai tây được giữ dưới đây như tư liệu giảng dạy lịch sử; giai đoạn cây, đất và điều kiện địa phương phải dẫn dắt quyết định thực tế.",
      "Đây là bản đồ khái niệm, không phải bộ công thức. Cách chuẩn bị, pha loãng, giai đoạn cây, vệ sinh và quy định địa phương đều quan trọng.",
      "Ghi nhận độ ẩm, lớp phủ, cấu trúc, cây tự mọc, côn trùng và phản ứng của cây. Thay đổi một yếu tố có thể quan sát, giữ phần đối chứng khi phù hợp và đánh giá theo thời gian.",
      "Học cách chuẩn bị và sử dụng từ người có kinh nghiệm, đồng thời bảo vệ con người, cây trồng, nguồn nước và đất."
    ],
    comparisonHeaders:["Góc nhìn","Thông thường","Hữu cơ","Natural Farming Vietnam"],
    comparisonRows:[
      ["Đầu vào","Có thể dùng phân bón và sản phẩm bảo vệ cây trồng thương mại.","Đầu vào tuân theo tiêu chuẩn hữu cơ áp dụng.","Ưu tiên vật liệu tại chỗ và chế phẩm tự làm."],
      ["Quản lý đất","Cày xới và kiểm soát trực tiếp là công cụ phổ biến.","Thực hành thay đổi theo tiêu chuẩn và bối cảnh nông trại.","Hướng đến ít xáo trộn và nhiều hoạt động sinh học hơn."],
      ["Ra quyết định","Thường theo lịch đầu vào và năng suất.","Kết hợp nông học với yêu cầu chứng nhận.","Nhấn mạnh quan sát và quan hệ sinh thái."]
    ],
    figureAlt:["Một người quan sát mẫu vật qua kính hiển vi","Sơ đồ cũ về sinh trưởng và chu kỳ dinh dưỡng của khoai tây"],
    figureCaption:["Quan sát kết nối điều nhìn thấy trên mặt đất với những quá trình quá nhỏ để thấy trực tiếp.",""],
    cta:"Hiểu cách tiếp cận"
  },
  en:{
    label:"Plants",title:"Feed the soil before feeding the plant.",
    intro:"Natural Farming sees plant health as the result of a living system where structure, organic matter, roots and microorganisms work together.",
    alt:"Fresh green plants growing in rich soil",
    toc:["A different question","Farming systems","Living soil","Nutritive cycle","Input index","Practice with care"],
    sections:[
      {index:"01 · Context",title:"A different way begins with a different question."},
      {index:"02 · Comparison",title:"Conventional, organic and Natural Farming."},
      {index:"03 · Foundation",title:"Soil is a place of exchange."},
      {index:"04 · Growth",title:"Read the plant’s changing needs."},
      {index:"05 · Knowledge index",title:"Eight names commonly encountered."},
      {index:"06 · Next step",title:"Begin small, record, compare."}
    ],
    paragraphs:[
      "Instead of asking only what a crop lacks, Natural Farming also asks what is happening in the soil, which local resources are being overlooked, and what intervention is sufficient.",
      "Legacy material contrasts ploughing, complete weeding and purchased inputs with reduced disturbance, living ground cover and farm-made inputs. These are directions for observation—not a universal prescription.",
      "Roots, minerals, water, air, organic matter and organisms form the soil environment. Covering the surface, returning appropriate organic matter and limiting unnecessary disturbance can support this system.",
      "Indigenous Microorganisms (IMO) are central in the legacy knowledge. Collection and culture require hygiene, judgment and on-site learning; they should not be treated as one identical product for every place.",
      "Legacy material organizes plant development into vegetative growth, transition, flowering and fruiting. Its potato diagram is retained below as a historical teaching aid; crop stage, soil and local conditions must guide actual decisions.",
      "This is a concept map, not a recipe set. Preparation, dilution, crop stage, hygiene and local regulation all matter.",
      "Record moisture, ground cover, structure, volunteer plants, insects and crop response. Change one observable factor, retain a comparison where practical, and evaluate through time.",
      "Learn preparation and use from experienced practitioners, and protect people, crops, water and soil."
    ],
    comparisonHeaders:["Lens","Conventional","Organic","Natural Farming Vietnam"],
    comparisonRows:[
      ["Inputs","Commercial fertilizers and crop-protection products may be used.","Inputs follow the organic standard in use.","Prioritizes local materials and farm-made preparations."],
      ["Soil management","Tillage and direct control are common tools.","Practices vary by standard and farm context.","Seeks less disturbance and more biological activity."],
      ["Decision making","Often follows input and yield schedules.","Combines agronomy with certification requirements.","Emphasizes observation and ecological relationships."]
    ],
    figureAlt:["A person observing a sample through a microscope","Legacy potato growth and nutritive-cycle diagram"],
    figureCaption:["Observation connects what is visible above ground with processes too small to see directly.",""],
    cta:"Understand our approach"
  }
};

export const PLANT_INPUTS = [
  {code:"IMO",vi:["Vi sinh vật bản địa","Quần thể vi sinh vật thích nghi tại chỗ được thu thập và nhân nuôi để dùng với đất và vật liệu hữu cơ."],en:["Indigenous Microorganisms","Locally adapted microorganism communities collected and cultured for use with soil and organic matter."]},
  {code:"LAB",vi:["Vi khuẩn lactic","Nhóm vi khuẩn tạo axit lactic được nhắc đến trong xử lý vật liệu hữu cơ và hệ thống nền chuồng."],en:["Lactic Acid Bacteria","Lactic-acid-producing bacteria discussed in organic material processing and livestock bedding systems."]},
  {code:"OHN",vi:["Dinh dưỡng thảo mộc phương Đông","Dịch chiết thảo mộc được dùng như một thành phần trong một số thực hành cho cây và vật nuôi."],en:["Oriental Herbal Nutrient","An herbal extract used as one component in some Natural Farming plant and animal practices."]},
  {code:"FPJ",vi:["Dịch thực vật lên men","Đầu vào lên men từ mô thực vật đang sinh trưởng và một nguồn đường."],en:["Fermented Plant Juice","A fermented input made from actively growing plant tissue and a sugar source."]},
  {code:"FFJ",vi:["Dịch trái cây lên men","Chế phẩm lên men từ trái cây, được tài liệu cũ liên hệ với giai đoạn ra hoa và tạo quả."],en:["Fermented Fruit Juice","A fruit-based ferment associated in legacy material with flowering and fruiting stages."]},
  {code:"FAA",vi:["Amino acid từ cá","Đầu vào lên men tận dụng phụ phẩm cá làm nguồn dinh dưỡng dạng lỏng."],en:["Fish Amino Acid","A fermented input that makes use of fish by-products as a liquid nutrient source."]},
  {code:"WCA",vi:["Canxi hòa tan trong nước","Đầu vào chứa canxi được dùng có chọn lọc theo giai đoạn phát triển và nhu cầu quan sát được của cây."],en:["Water-soluble Calcium","A calcium-containing input selectively used according to plant development and observed need."]},
  {code:"WCAP",vi:["Canxi phosphate hòa tan","Chế phẩm canxi và phosphate được liên hệ với các giai đoạn chuyển tiếp sinh trưởng."],en:["Water-soluble Calcium Phosphate","A calcium-and-phosphate preparation associated with transitional growth stages."]}
] as const;

export const ANIMALS_COPY:Record<Locale,Copy> = {
  vi:{
    label:"Vật nuôi",title:"Môi trường tốt bắt đầu từ tập tính tự nhiên.",
    intro:"Chuồng trại, nền lót, thức ăn và nhịp chăm sóc được định hình để vật nuôi thoải mái, biểu hiện hành vi phù hợp và được quan sát kỹ.",
    alt:"Heo con khỏe mạnh nghỉ trên nền rơm",
    toc:["Tập tính tự nhiên","Chuồng trại","Nền chuồng sâu","Chăm sóc heo","Chăm sóc gà","Sức khỏe & an toàn"],
    sections:[
      {index:"01 · Phúc lợi",title:"Tôn trọng vật nuôi trước khi thiết kế hệ thống."},
      {index:"02 · Chuồng trại",title:"Một công trình thở cùng khí hậu."},
      {index:"03 · Nền sâu",title:"Nền chuồng được quản lý như một lớp sống."},
      {index:"04 · Heo",title:"Chuyển thức ăn và chăm sóc theo giai đoạn sống."},
      {index:"05 · Gà",title:"Nền khô, khí tươi và không gian để bới."},
      {index:"06 · Trách nhiệm",title:"Phòng ngừa bắt đầu từ quan sát, không phải bỏ qua."}
    ],
    paragraphs:[
      "Hệ chăn nuôi Natural Farming hướng đến chăm sóc ít đầu vào nhưng tôn trọng nhu cầu hành vi cốt lõi. Heo ủi đất và đằm; gà bới, đậu và tắm bụi. Không gian, bóng mát, nước sạch, khu nghỉ khô và quan sát hằng ngày là nền tảng.",
      "Ít đầu vào không bao giờ đồng nghĩa ít trách nhiệm. Mật độ, dinh dưỡng, tiêm phòng, kiểm soát bệnh và chăm sóc thú y phải phù hợp loài, khí hậu và pháp luật địa phương.",
      "Thiết kế chuồng heo và gà cũ dùng trục dài đông–tây, mái cao lệch và cạnh mở để đưa khí nóng ẩm lên trên trong khi nắng tiếp cận nền. Vị trí cần đón gió, không ngập và thuận tiện tiếp cận.",
      "Hệ chuồng heo cũ mô tả lớp sâu với vật liệu gỗ thô phía dưới và vật liệu giàu carbon mịn hơn, đất, muối cùng chế phẩm vi sinh phía trên. Gà dùng nền đất và rơm cắt nông hơn. Mục tiêu là bề mặt khô, phân giải sinh học và không gian cho tập tính tự nhiên.",
      "Nền lót không tự vận hành. Cần theo dõi ẩm, mùi, độ nén, côn trùng và sự thoải mái của vật nuôi. Bổ sung vật liệu carbon khô và điều chỉnh thông gió khi điều kiện thay đổi; tìm hỗ trợ chuyên môn nếu vấn đề kéo dài.",
      "Tài liệu cũ bao gồm chọn heo con khỏe, ước tính khối lượng, chuyển thức ăn từ từ, khẩu phần theo giai đoạn, phối giống, sinh con và cai sữa. Nguyên tắc bền vững nhất là đổi thức ăn chậm và quan sát từng con.",
      "Đo vòng ngực và chiều dài thân theo mét. Công thức cũ là: vòng ngực × vòng ngực × chiều dài thân × 69,3. Chỉ xem đây là ước tính và xác minh với hướng dẫn chăn nuôi hiện hành.",
      "Kho kiến thức về gà bao gồm thiết kế chuồng, nền rơm, mua gà con, quây úm tròn, thức ăn, nước, cầu đậu và ổ đẻ. Gà con cần được bảo vệ khỏi gió lùa, thú săn, muỗi và stress nhiệt.",
      "Hướng dẫn cũ dùng thân nhiệt và nhiệt ủ trong quây tròn, tránh góc nơi gà con có thể chồng đè. Nhiệt độ và hành vi gà vẫn cần được theo dõi chủ động.",
      "Natural Farming không thay thế chẩn đoán thú y, chương trình tiêm phòng, an toàn sinh học, dinh dưỡng cân đối hay yêu cầu pháp lý về phúc lợi. Cách ly triệu chứng đáng lo, ghi nhận thay đổi và liên hệ bác sĩ thú y kịp thời."
    ],
    cards:[
      ["01","Tập tính","Tạo không gian vận động, tìm thức ăn và nghỉ ngơi."],
      ["02","Khí hậu","Chủ động dùng luồng khí, bóng mát và ánh nắng."],
      ["03","Quan sát","Đọc sự thèm ăn, tư thế, phân, âm thanh và hành vi xã hội."]
    ],
    bulletGroups:[
      ["Phần mái chồng bảo vệ nền khỏi mưa đồng thời để lại lối thoát cao cho khí nóng.","Cạnh mở hoặc rèm cuốn cho phép điều chỉnh theo mùa mà không chặn thông gió.","Tre, gỗ, gạch hoặc thép địa phương chỉ được dùng khi bảo đảm an toàn kết cấu."],
      ["Kiểm tra sự thèm ăn, uống nước, phân, hô hấp, dáng đi, da và hành vi xã hội hằng ngày.","Chuyển thức ăn từ từ, giữ nước sạch và luôn sẵn có.","Giữ hồ sơ phả hệ, điều trị, tử vong và quyết định sản xuất."]
    ],
    beddingHeaders:["Quan sát","Điều kiện mong muốn","Phản ứng"],
    beddingRows:[
      ["Độ ẩm","Bề mặt tơi, gọn, không có vùng ướt","Kiểm tra rò nước, luồng khí và cân bằng carbon"],
      ["Mùi","Mùi đất thay vì amoniac nồng","Giảm áp lực mật độ và xử lý vùng ướt"],
      ["Hành vi","Vật nuôi nghỉ và tìm thức ăn thoải mái","Kiểm tra nhiệt, chấn thương, côn trùng và độ bám nền"]
    ],
    stageItems:["Heo con cai sữa","Heo sinh trưởng","Heo nái hậu bị","Heo nái mang thai","Heo nái cho sữa","Heo nái trở lại phối giống"],
    chickenHeaders:["Yếu tố","Natural Farming Vietnam","Câu hỏi quản lý"],
    chickenRows:[
      ["Chuồng","Nơi trú thông gió, có tiếp cận ngoài trời khi an toàn","Gà có khô, mát và được bảo vệ không?"],
      ["Nền","Đất và rơm cắt được quản lý để giữ khô","Có xuất hiện amoniac hoặc nén chặt không?"],
      ["Quây úm","Tròn, được bảo vệ và đủ chỗ vận động","Gà con có phân bố đều và hoạt động không?"]
    ],
    figureAlt:["Sơ đồ luồng khí cũ cho chuồng heo Natural Farming","Các ví dụ cấu trúc chuồng heo cũ","Sơ đồ cũ về chuyển thức ăn cho heo trong bốn tuần","Gà trong khu chuồng thông gió tự nhiên","Sơ đồ quây úm tròn cũ"],
    figureCaption:["","","Sơ đồ chuyển đổi lịch sử; cần điều chỉnh cùng chuyên gia dinh dưỡng hoặc thú y."],
    notes:["Sáu giai đoạn trong chu kỳ dinh dưỡng cũ","Tư liệu ước tính khối lượng","Ranh giới sức khỏe vật nuôi"]
  },
  en:{
    label:"Animals",title:"A good environment begins with natural behavior.",
    intro:"Housing, bedding, feed and daily care are shaped so animals can stay comfortable, express suitable behavior and be observed closely.",
    alt:"Healthy piglets resting on straw bedding",
    toc:["Natural behavior","Housing","Deep bedding","Pig care","Chicken care","Health & safety"],
    sections:[
      {index:"01 · Welfare",title:"Respect the animal before designing the system."},
      {index:"02 · Housing",title:"A building that breathes with the climate."},
      {index:"03 · Deep bedding",title:"The floor is managed as a living layer."},
      {index:"04 · Pigs",title:"Transition feed and care by life stage."},
      {index:"05 · Chickens",title:"Dry footing, fresh air and room to scratch."},
      {index:"06 · Responsibility",title:"Prevention begins with observation—not omission."}
    ],
    paragraphs:[
      "Natural Farming livestock systems aim for low-input care while respecting core behavioral needs. Pigs root and wallow; chickens scratch, perch and dust-bathe. Space, shade, clean water, dry resting areas and daily observation are foundational.",
      "Low input never means low responsibility. Stocking density, nutrition, vaccination, disease control and veterinary care must fit the species, climate and local law.",
      "Legacy pig and chicken designs use an east–west building length, a high offset roof and open sides to move hot, moist air upward while sunlight reaches the floor. The site should be open to wind, free from flooding and practical to access.",
      "The legacy pig system describes a deep layer with coarse woody material below and finer carbon-rich material, soil, salt and microbial preparations above. Chickens use a shallower dirt-and-chopped-straw floor. The goals are a dry surface, biological breakdown and room for natural behavior.",
      "Bedding is not maintenance-free. Moisture, odor, compaction, pests and animal comfort must be monitored. Add dry carbon material and correct ventilation when conditions change; seek professional guidance for persistent problems.",
      "Legacy material covers selecting healthy piglets, estimating weight, gradual feed transition, growth-stage rations, breeding, farrowing and weaning. The most durable principle is to change feed slowly and observe every animal.",
      "Measure heart girth and body length in metres. The legacy formula is: heart girth × heart girth × body length × 69.3. Treat this only as an estimate and verify with current husbandry guidance.",
      "The chicken knowledge covers house design, straw bedding, purchasing chicks, a rounded brooder crib, feeds, water, perches and nesting. Chicks need protection from drafts, predators, mosquitoes and temperature stress.",
      "Legacy guidance uses body heat and composting warmth in a rounded brooder rather than corners where chicks can pile up. Temperature and chick behavior still require active monitoring.",
      "Natural Farming does not replace veterinary diagnosis, vaccination programs, biosecurity, balanced nutrition or legal welfare requirements. Isolate concerning symptoms, document changes and contact a veterinarian promptly."
    ],
    cards:[
      ["01","Behavior","Make room for movement, foraging and rest."],
      ["02","Climate","Use airflow, shade and sunlight deliberately."],
      ["03","Observation","Read appetite, posture, manure, sound and social behavior."]
    ],
    bulletGroups:[
      ["Roof overlap protects the bedding from rain while leaving a high outlet for hot air.","Open or curtained sides allow seasonal control without blocking ventilation.","Local bamboo, timber, masonry or steel may be used only where structurally safe."],
      ["Check appetite, water intake, manure, breathing, gait, skin and social behavior daily.","Keep feed changes gradual and water clean and continuously available.","Maintain records for lineage, treatment, mortality and production decisions."]
    ],
    beddingHeaders:["Observe","Desired condition","Response"],
    beddingRows:[
      ["Moisture","Tidy, friable surface without wet patches","Check leaks, airflow and carbon balance"],
      ["Odor","Earthy rather than sharp ammonia","Reduce loading pressure and correct wet zones"],
      ["Behavior","Animals rest and forage comfortably","Investigate heat, injury, pests and footing"]
    ],
    stageItems:["Weaned piglets","Growers","Gilts before pregnancy","Gestating sows","Lactating sows","Sows returning to mating"],
    chickenHeaders:["Element","Natural Farming Vietnam","Management question"],
    chickenRows:[
      ["Housing","Ventilated shelter with outdoor access where safe","Are birds dry, shaded and protected?"],
      ["Floor","Dirt and chopped straw managed for dryness","Is ammonia or compaction developing?"],
      ["Brooder","Rounded, protected and sized for movement","Are chicks evenly distributed and active?"]
    ],
    figureAlt:["Legacy airflow diagram for a Natural Farming pig house","Examples of legacy pig house structures","Legacy four-week pig feed transition diagram","Chickens in a naturally ventilated farm shelter","Legacy rounded brooder crib diagram"],
    figureCaption:["","","Historical phase-out diagram; adapt with a qualified nutrition or veterinary professional."],
    notes:["Six stages in the legacy nutritive cycle","Weight-estimation reference","Animal health boundary"]
  }
};
