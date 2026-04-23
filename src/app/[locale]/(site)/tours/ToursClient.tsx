"use client";

import { useState, useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import TourCard from "@/components/site/TourCard";

interface Tour {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  duration?: number | null;
  tourType?: string | null;
  images?: unknown;
  departures?: {
    id: string;
    departureDate: Date | string;
  }[];
}

export default function ToursClient({ tours }: { tours: Tour[] }) {
  const t = useTranslations("tours");
  const locale = useLocale();

  const TOUR_TYPES = [
    { value: "", label: t("filterTypeAll") },
    { value: "day_trip", label: t("filterType_day_trip") },
    { value: "cultural", label: t("filterType_cultural") },
    { value: "adventure", label: t("filterType_adventure") },
    { value: "trekking", label: t("filterType_trekking") },
    { value: "relax", label: t("filterType_relax") },
  ];

  const DURATIONS = [
    { value: "", label: t("filterDurAny") },
    { value: "1", label: t("filterDur1") },
    { value: "2-3", label: t("filterDur23") },
    { value: "4+", label: t("filterDur4plus") },
  ];

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [durationFilter, setDurationFilter] = useState("");
  const [priceMax, setPriceMax] = useState<number>(0);

  const maxPrice = useMemo(
    () => Math.max(...tours.map((t) => t.basePrice), 0),
    [tours]
  );

  const filtered = useMemo(() => {
    const cap = priceMax === 0 ? maxPrice : priceMax;
    return tours.filter((tour) => {
      if (search && !tour.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (typeFilter && tour.tourType !== typeFilter) return false;
      if (tour.basePrice > cap) return false;
      if (durationFilter) {
        const d = tour.duration ?? 0;
        if (durationFilter === "1" && d !== 1) return false;
        if (durationFilter === "2-3" && (d < 2 || d > 3)) return false;
        if (durationFilter === "4+" && d < 4) return false;
      }
      return true;
    });
  }, [tours, search, typeFilter, durationFilter, priceMax, maxPrice]);

  const priceDisplay = (priceMax || maxPrice).toLocaleString(
    locale === "en" ? "en-US" : "ru"
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-8 flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder={t("filterSearchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none focus:border-brand-blue transition-colors duration-200"
          />
        </div>

        {/* Type */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none focus:border-brand-blue transition-colors duration-200 bg-white cursor-pointer"
        >
          {TOUR_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {/* Duration */}
        <select
          value={durationFilter}
          onChange={(e) => setDurationFilter(e.target.value)}
          className="px-4 py-3 border border-gray-200 rounded-xl font-body text-sm focus:outline-none focus:border-brand-blue transition-colors duration-200 bg-white cursor-pointer"
        >
          {DURATIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        {/* Price range */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <span className="text-xs text-gray-500 font-heading font-600 uppercase tracking-wide whitespace-nowrap">
            {t("filterPriceLabel", { price: priceDisplay })}
          </span>
          <input
            type="range"
            min={0}
            max={maxPrice}
            step={500}
            value={priceMax || maxPrice}
            onChange={(e) => setPriceMax(Number(e.target.value))}
            className="flex-1 accent-brand-blue cursor-pointer"
          />
        </div>

        {/* Reset */}
        {(search || typeFilter || durationFilter || priceMax > 0) && (
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("");
              setDurationFilter("");
              setPriceMax(0);
            }}
            className="px-5 py-3 text-brand-blue border border-brand-blue rounded-xl font-heading font-700 text-sm uppercase tracking-wide hover:bg-brand-blue hover:text-white transition-colors duration-200 cursor-pointer whitespace-nowrap"
          >
            {t("resetFilters")}
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <svg
            className="w-16 h-16 mx-auto text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="font-heading font-700 text-gray-500 text-lg uppercase">
            {t("noResults")}
          </p>
          <p className="text-gray-400 text-sm mt-2">{t("noResultsSub")}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 font-heading mb-6">
            {t("foundCount")}{" "}
            <span className="font-700 text-gray-900">{filtered.length}</span>{" "}
            {t("foundTours", { n: filtered.length })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((tour, i) => (
              <TourCard key={tour.id} tour={tour} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
