import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Providers from "./providers";
import Analytics from "@/components/site/Analytics";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kapriz Travel — Туры по Кыргызстану и Центральной Азии",
  description:
    "Незабываемые туры по Кыргызстану, Казахстану и Узбекистану. Однодневные и многодневные туры от Kapriz Travel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${montserrat.variable} antialiased`}>
        <Analytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
