import type { Metadata, Viewport } from "next";
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

// Prevents iOS Safari from auto-zooming on input focus without locking user zoom
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // interactiveWidget keeps the viewport stable when the keyboard appears
  interactiveWidget: "resizes-visual",
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
