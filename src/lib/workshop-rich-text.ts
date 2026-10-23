export function safeWorkshopLink(value:unknown):string|null {
  if(typeof value!=="string")return null;
  if(value.startsWith("/")&&!value.startsWith("//"))return value;
  try{
    const url=new URL(value);
    return ["http:","https:","mailto:"].includes(url.protocol)?url.toString():null;
  }catch{return null}
}

export function safeWorkshopImage(value:unknown):string|null {
  const href=safeWorkshopLink(value);
  return href&&(href.startsWith("/")||/^https?:/.test(href))?href:null;
}
