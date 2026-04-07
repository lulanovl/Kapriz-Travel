"use client";

import { useState, useMemo } from "react";
import TourCard from "@/components/site/TourCard";

const TOUR_TYPES = [
  { value: "", label: "Все типы" },
  { value: "day_trip", label: "Однодневные" },
  { value: "cultural", label: "Культурные" },
  { value: "adventure", label: "Приключения" },
  { value: "trekking", label: "Треккинг" },
  { value: "relax", label: "Отдых" },
];

const DURATIONS = [
  { value: "", label: "Любая" },
  { value: "1", label: "1 день" },
  { value: "2-3", label: "2–3 дня" },
  { value: "4+", label: "4+ дней" },
];

interface Tour {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
  duration?: number | null;
  tourType?: string | null;
  images?: unknown;
  tourDates: {
    maxSeats: number;
    _count?: { applications: number };
  }[];
}

export default function ToursClient({ tours }: { tours: Tour[] }) {
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
    return tours.filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (typeFilter && t.tourType !== typeFilter) return false;
      if (t.basePrice > cap) return false;
      if (durationFilter) {
        const d = t.duration ?? 0;
        if (durationFilter === "1" && d !== 1) return false;
        if (durationFilter === "2-3" && (d < 2 || d > 3)) return false;
        if (durationFilter === "4+" && d < 4) return false;
      }
      return true;
    });
  }, [tours, search, typeFilter, durationFilter, priceMax, maxPrice]);

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
            placeholder="Поиск по названию..."
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
          {TOUR_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
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
            до {(priceMax || maxPrice).toLocaleString("ru")} с
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
            Сбросить
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-heading font-700 text-gray-500 text-lg uppercase">
            Туры не найдены
          </p>
          <p className="text-gray-400 text-sm mt-2">Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 font-heading mb-6">
            Найдено: <span className="font-700 text-gray-900">{filtered.length}</span> туров
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
