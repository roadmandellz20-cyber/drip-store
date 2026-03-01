import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FxLayer from "@/components/FxLayer";
import BackHomeArrow from "@/components/BackHomeArrow";
import { absoluteUrl, getSiteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE } from "@/lib/site";
import ToastClient from "./toast.client";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
    other: [{ url: "/icon.png", type: "image/png" }],
  },
  alternates: {
    canonical: "/archive",
  },
  openGraph: {
    type: "website",
    url: absoluteUrl("/archive"),
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [
      {
        url: absoluteUrl(SITE_OG_IMAGE),
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl(SITE_OG_IMAGE)],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/archive/assets/hero-bg.jpg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <FxLayer />
        <Header />
        <BackHomeArrow />
        <main>{children}</main>
        <Footer />
        <div id="toast" aria-live="polite" aria-atomic="true" />
        <ToastClient />
      </body>
    </html>
  );
}
