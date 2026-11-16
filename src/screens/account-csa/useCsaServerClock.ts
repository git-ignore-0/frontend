"use client";
import {useEffect,useState} from 'react';
/** receivedAt and elapsed time use the same monotonic clock, including collapsed rounds. */
export function useCsaServerClock(serverTime?:string,receivedAt?:number,enabled=true):number{
 const [clock,setClock]=useState(()=>({key:serverTime,started:receivedAt??performance.now(),now:performance.now()}));
 useEffect(()=>{
  if(!enabled||!serverTime)return;
  let active=true;
  queueMicrotask(()=>{if(active){const now=performance.now();setClock(previous=>({key:serverTime,started:receivedAt??(previous.key===serverTime?previous.started:now),now}))}});
  const timer=setInterval(()=>setClock(value=>({...value,now:performance.now()})),1000);
  return()=>{active=false;clearInterval(timer)};
 },[serverTime,receivedAt,enabled]);
 return serverTime?Date.parse(serverTime)+(clock.key===serverTime?Math.max(0,clock.now-clock.started):0):NaN;
}
