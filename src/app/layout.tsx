import { publicAsset } from "@/lib/paths";
import { Suspense } from "react";
import TransitionManager from "@/components/transition/TransitionManager";
import SiteHeader from "@/components/layout/SiteHeader";
import type { Metadata } from "next";
import "@/styles/tokens.css";
import "@/styles/globals.css";
import "@/styles/v2.css";
export const metadata: Metadata = {
  title: { default: "星汉扶犁", template: "%s · 星汉扶犁" },
  icons: { icon: publicAsset("/branding/author-avatar.jpg") },
  description: "中医药实践、医理观察、草木与日常。星汉扶犁的个人文集。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <a href="#main" className="skip-link">
          跳至主要内容
        </a>
        <TransitionManager
          header={
            <Suspense fallback={null}>
              <SiteHeader />
            </Suspense>
          }
        >
          {children}
        </TransitionManager>
      </body>
    </html>
  );
}
