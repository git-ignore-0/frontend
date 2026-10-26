export function formatUnitSize(value:string):string{
 const [integer,fraction]=value.split(".");
 if(fraction===undefined)return value;
 const compactFraction=fraction.replace(/0+$/,"");
 return compactFraction?`${integer}.${compactFraction}`:integer;
}
