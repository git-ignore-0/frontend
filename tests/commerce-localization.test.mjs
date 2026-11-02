import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("cart and checkout select complete Vietnamese or English copy from the active locale",()=>{
 const checkout=source("src/screens/Checkout.tsx");
 const ui=source("src/components/UI.tsx");
 assert.match(checkout,/const COPY=/);
 assert.match(checkout,/vi:\{/);
 assert.match(checkout,/en:\{/);
 assert.match(checkout,/copy=COPY\[ui\.locale\]/);
 assert.match(checkout,/GuestBuyerFields/);
 assert.match(readFileSync(new URL("../src/components/account/ShippingAddressFields.tsx",import.meta.url),"utf8"),/sanitizeVietnamPhoneInput/);
 assert.match(checkout,/provinceCode/);
 assert.match(checkout,/wardCode/);
 assert.match(ui,/locale==="en"\?"No image":"Chưa có ảnh"/);
 assert.match(ui,/locale==="en"\?`Decrease quantity/);
});

test("account order and address screens select bilingual copy from the active locale",()=>{
 const orders=source("src/screens/AccountOrders.tsx");
 const profile=source("src/screens/AccountProfile.tsx");
 assert.match(orders,/const C=/);
 assert.match(orders,/copy=C\[ui\.locale\]/);
 assert.match(profile,/const ADDRESS_COPY=/);
 assert.match(profile,/copy=ADDRESS_COPY\[ui\.locale\]/);
});

test("English order history keeps shared pagination localized",()=>{
 const orders=source("src/screens/AccountOrders.tsx"),pagedList=source("src/components/account/PagedList.tsx"),footer=source("src/components/account/ListPaginationFooter.tsx");
 assert.match(orders,/STORE_STATUS\[order\.status\]\[ui\.locale\]/);
 assert.match(orders,/ListPaginationFooter/);
 assert.match(pagedList,/ListPaginationFooter/);
 assert.match(footer,/locale==="en"\?"Try again":"Thử lại"/);
 assert.match(footer,/locale==="en"\?`Load more \$\{count\} items`:`Xem thêm/);
 assert.match(footer,/Could not load more items/);
});

test("English checkout localizes integration fallbacks and the submit action",()=>{
 const context=source("src/state/NFVContext.tsx");
 const checkout=source("src/screens/Checkout.tsx");
 assert.match(context,/ui\.locale==="en"\?`API is not connected: \$\{method\}`:`Chưa kết nối API: \$\{method\}`/);
 assert.match(context,/ui\.locale==="en"\?"Unable to complete the action\. Please try again\.":"Không thể thực hiện\. Vui lòng thử lại\."/);
 assert.match(checkout,/confirm:"Continue"/);
});

test("adding a product to the cart uses the active locale for its toast",()=>{
 const context=source("src/state/NFVContext.tsx");
 assert.match(context,/toast:ui\.locale==="en"\?"Added to cart":"Đã thêm vào giỏ"/);
});
