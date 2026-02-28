import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FxLayer from "@/components/FxLayer";
import BackHomeArrow from "@/components/BackHomeArrow";
import ToastClient from "./toast.client";

export const metadata: Metadata = {
  title: "MUGEN DISTRICT",
  description: "Urban Tokyo Chaos — Archive",
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
