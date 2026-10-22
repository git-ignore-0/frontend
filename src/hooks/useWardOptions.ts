"use client";

import {useEffect} from "react";
import {useNFV} from "@/state/NFVContext";

/** Load a province's wards once, including when editing a previously saved address. */
export function useWardOptions(city:string){
  const {data,ui,loadWards}=useNFV();
  const wards=data.wards[city];
  const status=ui.wardFetchState[city];

  useEffect(()=>{
    if(city && !wards && status!=="loading" && status!=="error") {
      void loadWards(city);
    }
  },[city,wards,status,loadWards]);

  const loading=!!city&&!wards&&status!=="error";
  const error=!!city&&(status==="error"||(status==="ready"&&wards?.length===0));
  return {
    options:wards??[],
    loading,
    error,
    retry:()=>loadWards(city,true),
  };
}
