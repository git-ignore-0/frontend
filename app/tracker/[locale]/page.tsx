import { NFVApp } from "../../NFVApp";
import { trackerCopy } from "@/screens/tracker/tracker-copy";
import type { Locale } from "@/types";
export async function generateMetadata({ params }: {
    params: Promise<{
        locale: string;
    }>;
}) {
    const { locale } = await params;
    const copy = trackerCopy(locale === "en" ? "en" : "vi");
    return { title: copy.title, description: copy.intro };
}
export default async function Page({ params }: {
    params: Promise<{
        locale: string;
    }>;
}) {
    const { locale } = await params;
    return <NFVApp initialPage="tracker" initialLocale={(locale === "en" ? "en" : "vi") as Locale}/>;
}
