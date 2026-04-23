"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function HeroSection() {
  const t = useTranslations("home");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background photo */}
      <Image
        src="/images/hero-bg.jpg"
        alt={t("heroAlt")}
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="max-w-3xl">
          {/* Badge */}
          <div
            className={`inline-flex max-w-full items-center gap-2 bg-white/10 border border-brand-lime/30 rounded-full px-4 py-2 mb-6 transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <span className="w-2 h-2 shrink-0 rounded-full bg-brand-lime animate-pulse" />
            <span className="text-white/80 text-xs sm:text-sm font-heading font-600 uppercase tracking-wide sm:tracking-widest truncate">
              {t("badge")}
            </span>
          </div>

          {/* Heading */}
          <h1
            className={`font-heading font-black text-white uppercase leading-none tracking-tight transition-all duration-700 delay-100 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <span className="block text-[11vw] sm:text-6xl lg:text-8xl">{t("hero1")}</span>
            <span className="block text-[11vw] sm:text-6xl lg:text-8xl text-brand-lime">
              {t("hero2")}
            </span>
            <span className="block text-[11vw] sm:text-6xl lg:text-8xl">{t("hero3")}</span>
          </h1>

          <p
            className={`mt-6 text-white/70 text-lg sm:text-xl leading-relaxed max-w-xl transition-all duration-700 delay-200 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {t("heroSub")}
          </p>

          <div
            className={`flex flex-col sm:flex-row gap-4 mt-10 transition-all duration-700 delay-300 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <Link
              href="/tours"
              className="bg-brand-lime text-brand-blue-deeper font-heading font-800 uppercase tracking-wider text-base px-8 py-4 rounded-full hover:bg-brand-lime-dark transition-colors duration-200 cursor-pointer text-center"
            >
              {t("viewTours")}
            </Link>
            <Link
              href="/apply"
              className="border-2 border-white/30 text-white font-heading font-700 uppercase tracking-wider text-base px-8 py-4 rounded-full hover:border-brand-lime hover:text-brand-lime transition-colors duration-200 cursor-pointer text-center"
            >
              {t("applyNow")}
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-white/40 text-xs uppercase tracking-widest font-heading">
          {t("scrollHint")}
        </span>
        <div className="w-px h-12 bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </section>
  );
}
