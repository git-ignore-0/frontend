import type {Metadata} from "next";
import {permanentRedirect} from "next/navigation";
import {publicPageMetadata} from "@/lib/public-metadata";
export const metadata:Metadata=publicPageMetadata("home","vi");
export default function Page(){permanentRedirect("/vi");}
