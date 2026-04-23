"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

export default function ItineraryView({
  itinerary,
}: {
  itinerary: unknown;
  title: string;
}) {
  const t = useTranslations("tourDetail");
  const [openDay, setOpenDay] = useState<number | null>(0);

  if (!Array.isArray(itinerary) || itinerary.length === 0) return null;

  const days = itinerary as ItineraryDay[];

  return (
    <div>
      <h2 className="font-heading font-800 text-gray-900 uppercase text-xl mb-6">
        {t("itineraryHeading")}
      </h2>
      <div className="space-y-3">
        {days.map((day, i) => (
          <div
            key={i}
            className="border border-gray-100 rounded-2xl overflow-hidden"
          >
            <button
              onClick={() => setOpenDay(openDay === i ? null : i)}
              className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
              aria-expanded={openDay === i}
            >
              <div className="w-10 h-10 bg-blue-gradient rounded-xl flex items-center justify-center shrink-0">
                <span className="font-heading font-900 text-brand-lime text-sm">
                  {day.day}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-heading font-700 text-gray-900 text-sm uppercase tracking-wide">
                  {t("dayLabel", { n: day.day })}
                </div>
                <div className="font-heading font-800 text-gray-800 text-base leading-tight truncate">
                  {day.title}
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${
                  openDay === i ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {openDay === i && day.description && (
              <div className="px-5 pb-5 pt-0">
                <div className="pl-14 text-gray-600 text-sm leading-relaxed">
                  {day.description}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
