import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("cart and checkout select complete Vietnamese or English copy from the active locale",()=>{
 const checkout=source("src/screens/Checkout.tsx");
 const ui=source("src/components/UI.tsx");
 assert.match(checkout,/const CHECKOUT_COPY=/);
 assert.match(checkout,/vi:\{/);
 assert.match(checkout,/en:\{/);
 assert.match(checkout,/const copy=CHECKOUT_COPY\[ui\.locale\]/);
 assert.match(checkout,/validateRecipient\(ui\.recipient,data\.provinces,data\.wards,ui\.locale\)/);
 assert.match(checkout,/<Quantity[^>]*locale=\{ui\.locale\}/);
 assert.match(ui,/locale==="en"\?"No image":"Chưa có ảnh"/);
 assert.match(ui,/locale==="en"\?`Decrease quantity/);
});

test("account order and address screens select bilingual copy from the active locale",()=>{
 const orders=source("src/screens/AccountOrders.tsx");
 const profile=source("src/screens/AccountProfile.tsx");
 assert.match(orders,/const ORDER_COPY[^=]*=/);
 assert.match(orders,/copy=ORDER_COPY\[ui\.locale\]/);
 assert.match(profile,/const ADDRESS_COPY=/);
 assert.match(profile,/copy=ADDRESS_COPY\[ui\.locale\]/);
});

test("English order history keeps shared pagination and image fallbacks localized",()=>{
 const orders=source("src/screens/AccountOrders.tsx");
 const pagedList=source("src/components/account/PagedList.tsx");
 assert.equal((orders.match(/<Photo[^>]+locale=\{ui\.locale\}/g)??[]).length,2);
 assert.match(pagedList,/ui\.locale==="en"\?"Try again":"Thử lại"/);
 assert.match(pagedList,/ui\.locale==="en"\?`Load more \$\{[^}]+\} items`:`Xem thêm/);
 assert.match(pagedList,/ui\.locale==="en"\?"Could not load more history\. Try again\.":"Không tải được thêm lịch sử\. Hãy thử lại\."/);
});

test("English checkout localizes integration fallbacks and the submit action",()=>{
 const context=source("src/state/NFVContext.tsx");
 const checkout=source("src/screens/Checkout.tsx");
 assert.match(context,/ui\.locale==="en"\?`API is not connected: \$\{method\}`:`Chưa kết nối API: \$\{method\}`/);
 assert.match(context,/ui\.locale==="en"\?"Unable to complete the action\. Please try again\.":"Không thể thực hiện\. Vui lòng thử lại\."/);
 assert.match(checkout,/confirm:"Confirm & pay"/);
});

test("adding a product to the cart uses the active locale for its toast",()=>{
 const context=source("src/state/NFVContext.tsx");
 assert.match(context,/toast:ui\.locale==="en"\?"Added to cart":"Đã thêm vào giỏ"/);
});
