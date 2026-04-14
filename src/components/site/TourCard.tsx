"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

const TYPE_LABELS: Record<string, string> = {
  day_trip: "Однодневный",
  cultural: "Культурный",
  adventure: "Приключения",
  trekking: "Треккинг",
  relax: "Отдых",
};

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600&q=80",
];

interface TourCardProps {
  tour: {
    id: string;
    title: string;
    slug: string;
    basePrice: number;
    duration?: number | null;
    tourType?: string | null;
    images?: unknown;
    departures?: { id: string; departureDate: Date | string }[];
  };
  index?: number;
}

export default function TourCard({ tour, index = 0 }: TourCardProps) {
  const router = useRouter();

  const rawImages = Array.isArray(tour.images) ? (tour.images as string[]) : [];
  const allImages =
    rawImages.length > 0
      ? rawImages
      : [PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length]];

  const [currentIdx, setCurrentIdx] = useState(0);
  const hasMultiple = allImages.length > 1;

  // Track touch start for swipe
  const touchStartX = useRef<number | null>(null);

  const goTo = (idx: number) => setCurrentIdx((idx + allImages.length) % allImages.length);

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    goTo(currentIdx - 1);
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    goTo(currentIdx + 1);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      goTo(diff > 0 ? currentIdx + 1 : currentIdx - 1);
    }
    touchStartX.current = null;
  };

  const hasUpcoming = !!tour.departures?.[0];

  return (
    // Outer div handles navigation — no button-inside-anchor issue
    <div
      onClick={() => router.push(`/tours/${tour.slug}`)}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer"
    >
      {/* ── Image strip carousel ── */}
      <div
        className="relative h-52 overflow-hidden"
        onTouchStart={hasMultiple ? onTouchStart : undefined}
        onTouchEnd={hasMultiple ? onTouchEnd : undefined}
      >
        {/*
          Sliding strip: all images laid out side-by-side in a single row.
          Translating X by -currentIdx * (100 / allImages.length) percent
          reveals the correct image with a smooth CSS transition.
        */}
        <div
          className="flex h-full transition-transform duration-300 ease-out will-change-transform"
          style={{
            width: `${allImages.length * 100}%`,
            transform: `translateX(-${(currentIdx * 100) / allImages.length}%)`,
          }}
        >
          {allImages.map((src, i) => (
            <div
              key={src + i}
              className="relative h-full flex-shrink-0"
              style={{ width: `${100 / allImages.length}%` }}
            >
              <Image
                src={src}
                alt={`${tour.title} — фото ${i + 1}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={i === 0}
              />
            </div>
          ))}
        </div>

        {/* Type badge */}
        {tour.tourType && (
          <div className="absolute top-3 left-3 z-10 bg-brand-blue/90 backdrop-blur-sm text-white text-xs font-heading font-700 uppercase tracking-wider px-3 py-1 rounded-full pointer-events-none">
            {TYPE_LABELS[tour.tourType] ?? tour.tourType}
          </div>
        )}

        {/* Duration */}
        {tour.duration && (
          <div className="absolute top-3 right-3 z-10 bg-black/50 backdrop-blur-sm text-white text-xs font-heading font-600 px-3 py-1 rounded-full pointer-events-none">
            {tour.duration}{" "}
            {tour.duration === 1 ? "день" : tour.duration <= 4 ? "дня" : "дней"}
          </div>
        )}

        {/* Prev / Next buttons — only when multiple images */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/75 transition-colors duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity"
              aria-label="Предыдущее фото"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/75 transition-colors duration-150 sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity"
              aria-label="Следующее фото"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Dot indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 items-center">
              {allImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(i);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIdx ? "bg-white w-4" : "bg-white/55 w-1.5 hover:bg-white/80"
                  }`}
                  aria-label={`Фото ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Card content ── */}
      <div className="p-5">
        <h3 className="font-heading font-800 text-gray-900 text-base leading-tight line-clamp-2 group-hover:text-brand-blue transition-colors duration-200">
          {tour.title}
        </h3>

        <div className="flex items-center justify-between mt-4">
          <div>
            <span className="text-xs text-gray-400 font-heading uppercase tracking-wider">от</span>
            <div className="font-heading font-900 text-brand-blue text-xl">
              {tour.basePrice.toLocaleString("ru")}{" "}
              <span className="text-sm font-600">сом</span>
            </div>
          </div>

          {hasUpcoming && (
            <div className="text-xs font-heading font-700 uppercase tracking-wide text-green-400">
              Есть даты
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-1 text-brand-blue font-heading font-700 text-sm uppercase tracking-wider group-hover:gap-2 transition-all duration-200">
          Подробнее
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>
    </div>
  );
}
