import { notFound } from "next/navigation";
import { NFVApp } from "../../NFVApp";
import { TESTIMONIALS_COPY } from "@/data/testimonials-copy";
import type { Metadata } from "next";
import type { Locale } from "@/types";

export async function generateMetadata({ params }: { params: Promise<{locale:string}> }): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "vi" && locale !== "en") return {};
  const copy = TESTIMONIALS_COPY[locale];
  return { title: `${copy.pageTitle} | Natural Farming Vietnam`, description: copy.pageIntro,
    alternates: { canonical: `/testimonials/${locale}`, languages: { vi: "/testimonials/vi", en: "/testimonials/en" } } };
}
export default async function Page({ params }: { params: Promise<{locale:string}> }) {
  const { locale } = await params;
  if (locale !== "vi" && locale !== "en") notFound();
  return <NFVApp initialPage="testimonials" initialLocale={locale as Locale} />;
}
