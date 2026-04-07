"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/tours", label: "Туры" },
  { href: "/about", label: "О нас" },
  { href: "/contact", label: "Контакты" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-brand-blue/95 backdrop-blur-sm shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <KaprizLogo />
            <span className="font-heading font-black text-white text-xl tracking-tight uppercase">
              KAPRIZ
            </span>
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

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/apply"
              className="bg-brand-lime text-brand-blue-deeper font-heading font-800 text-sm uppercase tracking-wider px-5 py-2.5 rounded-full hover:bg-brand-lime-dark transition-colors duration-200 cursor-pointer"
            >
              Оставить заявку
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors duration-200 cursor-pointer"
            aria-label="Открыть меню"
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
          <div className="px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="font-heading font-700 text-white/80 hover:text-brand-lime transition-colors duration-200 text-sm uppercase tracking-wider cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/apply"
              onClick={() => setMenuOpen(false)}
              className="bg-brand-lime text-brand-blue-deeper font-heading font-800 text-sm uppercase tracking-wider px-5 py-3 rounded-full text-center hover:bg-brand-lime-dark transition-colors duration-200 cursor-pointer"
            >
              Оставить заявку
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function KaprizLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 2C14 2 4 8.5 4 16C4 21.523 8.477 26 14 26C19.523 26 24 21.523 24 16C24 8.5 14 2 14 2Z"
        fill="#CCFF00"
      />
      <path
        d="M14 8C14 8 8 12 8 17C8 20.314 10.686 23 14 23C17.314 23 20 20.314 20 17C20 12 14 8 14 8Z"
        fill="#1B4FD8"
      />
    </svg>
  );
}
