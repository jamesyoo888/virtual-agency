import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import AttributionSnapshotClient from "@/components/attribution-snapshot";
import { organizationLd, siteNavigationLd, ldScript } from "@/lib/seo/json-ld";
import { getBanner } from "@/lib/banner";
import SiteBanner, { type BannerConfig } from "@/components/site-banner";
import CookieConsent from "@/components/cookie-consent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://virtual-agency-murex.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Virtual Agency — AI Virtual Models",
    template: "%s · Virtual Agency",
  },
  description:
    "실제보다 완벽한, 언제나 브랜드에 최적화된 AI 버추얼 모델 에이전시.",
  applicationName: "Virtual Agency",
  openGraph: {
    title: "Virtual Agency — AI Virtual Models",
    description:
      "실제보다 완벽한, 언제나 브랜드에 최적화된 AI 버추얼 모델 에이전시.",
    url: SITE_URL,
    siteName: "Virtual Agency",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Virtual Agency — AI Virtual Models",
    description:
      "실제보다 완벽한, 언제나 브랜드에 최적화된 AI 버추얼 모델 에이전시.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const banner = await getBanner();
  const navLd = siteNavigationLd([
    { name: "카탈로그", url: `${SITE_URL}/` },
    { name: "AI 매칭", url: `${SITE_URL}/match` },
    { name: "서비스", url: `${SITE_URL}/services` },
    { name: "가격", url: `${SITE_URL}/pricing` },
    { name: "사례", url: `${SITE_URL}/cases` },
    { name: "블로그", url: `${SITE_URL}/blog` },
    { name: "FAQ", url: `${SITE_URL}/faq` },
    { name: "프레스", url: `${SITE_URL}/press` },
    { name: "크리에이터 합류", url: `${SITE_URL}/careers` },
    { name: "회사 소개", url: `${SITE_URL}/about` },
  ]);
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldScript(organizationLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ldScript(navLd) }}
        />
        {banner && <SiteBanner banner={banner as BannerConfig} />}
        <ToastProvider>{children}</ToastProvider>
        <AttributionSnapshotClient />
        <CookieConsent />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
