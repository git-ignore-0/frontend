import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
import test from "node:test";

async function loadCartPersistence(){
  const url=new URL("../src/state/cart-persistence.ts",import.meta.url);
  assert.equal(existsSync(url),true,"cart persistence module must exist");
  return import(`data:text/javascript,${encodeURIComponent(stripTypeScriptTypes(readFileSync(url,"utf8")))}`);
}

function memoryStorage(initial={}){
  const values=new Map(Object.entries(initial));
  return {
    getItem:key=>values.get(key)??null,
    setItem:(key,value)=>values.set(key,value),
    removeItem:key=>values.delete(key),
  };
}

test("cart survives a document reload within the browser session",async()=>{
  const {loadCart,saveCart}=await loadCartPersistence();
  const storage=memoryStorage();
  saveCart(storage,{vegetable_1:2,rice:1});
  assert.deepEqual(loadCart(storage),{vegetable_1:2,rice:1});
});

test("invalid or unsafe persisted cart entries are discarded",async()=>{
  const {CART_STORAGE_KEY,loadCart}=await loadCartPersistence();
  const storage=memoryStorage({
    [CART_STORAGE_KEY]:JSON.stringify({good:3,zero:0,negative:-1,huge:500,fraction:1.5,"bad id":2}),
  });
  assert.deepEqual(loadCart(storage),{good:3,huge:99});
});

test("empty carts remove stale session data",async()=>{
  const {CART_STORAGE_KEY,saveCart}=await loadCartPersistence();
  const storage=memoryStorage({[CART_STORAGE_KEY]:"stale"});
  saveCart(storage,{});
  assert.equal(storage.getItem(CART_STORAGE_KEY),null);
});
