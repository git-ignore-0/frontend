/** Static editorial photographs are owned and served by this frontend. */
export function siteImageSrc(file:string){
  return `/images/${file.replace(/^\/+/,"")}`;
}
