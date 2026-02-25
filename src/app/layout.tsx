import "./globals.css";
import { PromoBar } from "@/components/PromoBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Dripstore",
  description: "Clothing store",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black">
        <PromoBar />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
