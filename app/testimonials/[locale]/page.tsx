import { notFound } from "next/navigation";
import { NFVApp } from "../../NFVApp";
import type { Metadata } from "next";
import type { Locale } from "@/types";
import {publicPageMetadata} from "@/lib/public-metadata";

export async function generateMetadata({ params }: { params: Promise<{locale:string}> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "vi" && locale !== "en") return {};
  return publicPageMetadata("testimonials",locale);
}
export default async function Page({ params }: { params: Promise<{locale:string}> }) {
  const { locale } = await params;
  if (locale !== "vi" && locale !== "en") notFound();
  return <NFVApp initialPage="testimonials" initialLocale={locale as Locale} />;
}
