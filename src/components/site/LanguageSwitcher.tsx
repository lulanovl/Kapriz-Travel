"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

interface Props {
  variant?: "compact" | "full";
}

export default function LanguageSwitcher({ variant = "compact" }: Props) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(next: string) {
    router.replace(pathname, { locale: next });
  }

  if (variant === "full") {
    return (
      <div className="flex rounded-xl overflow-hidden border border-white/15 bg-white/5">
        {(["ru", "en"] as const).map((lang, i) => (
          <button
            key={lang}
            type="button"
            onClick={() => switchTo(lang)}
            className={`flex-1 min-h-[44px] text-sm font-heading font-800 uppercase tracking-widest transition-all duration-200 cursor-pointer ${
              i > 0 ? "border-l border-white/15" : ""
            } ${
              locale === lang
                ? "bg-brand-lime text-brand-blue-deeper"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            {lang}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 bg-white/10 rounded-full p-0.5">
      {(["ru", "en"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => switchTo(lang)}
          className={`px-3 py-1.5 rounded-full text-xs font-heading font-800 uppercase tracking-wider transition-colors duration-200 cursor-pointer ${
            locale === lang
              ? "bg-brand-lime text-brand-blue-deeper"
              : "text-white/70 hover:text-white"
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
