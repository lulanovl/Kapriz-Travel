"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Header() {
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/tours" as const, label: t("tours") },
    { href: "/about" as const, label: t("about") },
    { href: "/contact" as const, label: t("contact") },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-brand-blue/95 backdrop-blur-sm shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <KaprizLogo />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-heading font-700 text-white/80 hover:text-brand-lime transition-colors duration-200 text-sm uppercase tracking-wider cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA + switcher */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/apply"
              className="bg-brand-lime text-brand-blue-deeper font-heading font-800 text-sm uppercase tracking-wider px-5 py-2.5 rounded-full hover:bg-brand-lime-dark transition-colors duration-200 cursor-pointer"
            >
              {t("applyBtn")}
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-200 cursor-pointer"
            aria-label={t("openMenu")}
          >
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-brand-blue-dark border-t border-white/10">
          <div className="px-4 pt-2 pb-5 flex flex-col">
            {/* Nav links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-3.5 font-heading font-700 text-white/80 hover:text-brand-lime transition-colors duration-200 text-sm uppercase tracking-wider cursor-pointer"
              >
                {link.label}
              </Link>
            ))}

            {/* Bottom actions */}
            <div className="mt-4 flex flex-col gap-3">
              <LanguageSwitcher variant="full" />
              <Link
                href="/apply"
                onClick={() => setMenuOpen(false)}
                className="bg-brand-lime text-brand-blue-deeper font-heading font-800 text-sm uppercase tracking-widest px-5 py-3.5 rounded-2xl text-center hover:bg-brand-lime-dark transition-colors duration-200 cursor-pointer min-h-[52px] flex items-center justify-center"
              >
                {t("applyBtn")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function KaprizLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Image
        src="/images/kg-map.png"
        alt="Кыргызстан"
        width={120}
        height={40}
        className="h-9"
        style={{ width: "auto" }}
        priority
      />
      <div className="flex flex-col leading-none">
        <span
          className="text-white font-black uppercase tracking-wide"
          style={{ fontSize: "1.15rem", letterSpacing: "0.08em" }}
        >
          KAPRIZ
        </span>
        <span
          className="text-brand-lime font-bold uppercase"
          style={{ fontSize: "0.58rem", letterSpacing: "0.28em" }}
        >
          TRAVEL
        </span>
      </div>
    </div>
  );
}
