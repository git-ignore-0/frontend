import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/noto-sans/wght.css";
import "./styles/00-foundation-and-store.css";
import "./styles/10-account-and-responsive.css";
import "./styles/20-history-and-catalog.css";
import "./styles/30-account-navigation.css";
import "./styles/40-form-controls-and-chips.css";
import "./styles/50-date-range-and-actions.css";
import "./styles/60-data-states.css";
import "./styles/70-order-detail-layout.css";
import "./styles/80-checkout-flow.css";
import "./styles/90-coupon.css";
import "./styles/95-category-hierarchy.css";
import "./styles/96-account-benefits.css";
import "./styles/99-local-fonts.css";
import "./styles/05-main-navigation.css";
import "./styles/06-auth.css";
import "./styles/07-brand-and-footer.css";
import "./styles/04-editorial-fonts.css";
import "./styles/08-home.css";
import "./styles/09-editorial.css";
import "./styles/09-workshops.css";
import "./styles/10-knowledge.css";
import "./styles/11-tracker.css";
import "./styles/03-overlays.css";
import "./styles/12-testimonials.css";
import "./styles/13-csa.css";
import "./styles/14-referral-share.css";

export const metadata: Metadata = {
  title: "Natural Farming Vietnam",
  description: "Natural Farming Vietnam – Sự sống bắt đầu từ đất sống."
};
export const viewport: Viewport = { themeColor: "#f7f6ef" };

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="vi"><body>{children}</body></html>;
}
