import crypto from "node:crypto";

type RevalidationResult=
  | {ok:true;tags:string[]}
  | {ok:false;status:400|401;error:"invalid_json"|"invalid_payload"|"invalid_signature"};

const STATIC_TAGS=new Set(["site-settings","workshops","testimonials","tracker-farms","store-categories","store-products","store-product-details"]);
const WORKSHOP_TAG=/^workshop:[a-z0-9_-]{1,180}$/i;
const TESTIMONIAL_TAG=/^testimonial:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORE_PRODUCT_TAG=/^store-product:[a-z0-9_-]{1,180}$/i;

function allowedTag(value:unknown):value is string{
  return typeof value==="string"&&value.length<=200&&(STATIC_TAGS.has(value)||WORKSHOP_TAG.test(value)||TESTIMONIAL_TAG.test(value)||STORE_PRODUCT_TAG.test(value));
}

export async function readLimitedRequestBody(request:Request,maxBytes=8192):Promise<Buffer|null>{
  const declared=Number(request.headers.get("content-length"));
  if(Number.isFinite(declared)&&declared>maxBytes)return null;
  if(!request.body)return Buffer.alloc(0);
  const reader=request.body.getReader();
  const chunks:Buffer[]=[];
  let size=0;
  while(true){
    const {done,value}=await reader.read();
    if(done)break;
    size+=value.byteLength;
    if(size>maxBytes){await reader.cancel().catch(()=>undefined);return null;}
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks,size);
}

export function parseSignedRevalidation({secret,timestamp,signature,raw,nowSeconds=Date.now()/1000}:{
  secret:string;
  timestamp:string;
  signature:string;
  raw:Buffer;
  nowSeconds?:number;
}):RevalidationResult{
  const received=signature.replace(/^sha256=/,"");
  const timestampNumber=Number(timestamp);
  if(secret.length<32||!Number.isFinite(timestampNumber)||Math.abs(nowSeconds-timestampNumber)>300||!/^[0-9a-f]{64}$/i.test(received)){
    return {ok:false,status:401,error:"invalid_signature"};
  }
  const expected=crypto.createHmac("sha256",secret).update(`${timestamp}.`).update(raw).digest("hex");
  if(!crypto.timingSafeEqual(Buffer.from(received,"hex"),Buffer.from(expected,"hex"))){
    return {ok:false,status:401,error:"invalid_signature"};
  }
  let body:unknown;
  try{
    body=JSON.parse(raw.toString("utf8")) as unknown;
  }catch{
    return {ok:false,status:400,error:"invalid_json"};
  }
  if(!body||typeof body!=="object"||Array.isArray(body))return {ok:false,status:400,error:"invalid_payload"};
  const submitted=(body as {tags?:unknown}).tags;
  if(!Array.isArray(submitted)||submitted.length<1||submitted.length>20||!submitted.every(allowedTag))return {ok:false,status:400,error:"invalid_payload"};
  const tags=[...new Set(submitted)];
  return {ok:true,tags};
}
