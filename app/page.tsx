import type {Metadata} from "next";
import { NFVApp } from "./NFVApp";
import {publicPageMetadata} from "@/lib/public-metadata";
export const metadata:Metadata=publicPageMetadata("home","vi");
export default function Page() { return <NFVApp initialPage="home" initialLocale="vi" />; }
