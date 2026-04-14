"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";

interface Props {
  images: string[];
  title: string;
  tourType?: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  day_trip: "Однодневный",
  cultural: "Культурный",
  adventure: "Приключения",
  trekking: "Треккинг",
  relax: "Отдых",
};

export default function TourHeroCarousel({ images, title, tourType }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goTo = (idx: number) =>
    setCurrentIdx((idx + images.length) % images.length);

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
    if (Math.abs(diff) > 40) goTo(diff > 0 ? currentIdx + 1 : currentIdx - 1);
    touchStartX.current = null;
  };

  const hasMultiple = images.length > 1;

  return (
    <>
      {/* ── Hero image strip ── */}
      <div
        className="relative h-[55vh] sm:h-[65vh] bg-gray-900 overflow-hidden"
        onTouchStart={hasMultiple ? onTouchStart : undefined}
        onTouchEnd={hasMultiple ? onTouchEnd : undefined}
      >
        {/* Sliding strip */}
        <div
          className="flex h-full transition-transform duration-350 ease-out will-change-transform"
          style={{
            width: `${images.length * 100}%`,
            transform: `translateX(-${(currentIdx * 100) / images.length}%)`,
          }}
        >
          {images.map((src, i) => (
            <div
              key={src + i}
              className="relative h-full flex-shrink-0"
              style={{ width: `${100 / images.length}%` }}
            >
              <Image
                src={src}
                alt={`${title} — фото ${i + 1}`}
                fill
                className="object-cover opacity-80"
                priority={i === 0}
                sizes="100vw"
              />
            </div>
          ))}
        </div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

        {/* Back button */}
        <Link
          href="/tours"
          className="absolute top-6 left-6 z-20 flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-full text-sm font-heading font-700 hover:bg-white/20 transition-colors duration-200 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          Все туры
        </Link>

        {/* Prev / Next arrows */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors duration-150"
              aria-label="Предыдущее фото"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 transition-colors duration-150"
              aria-label="Следующее фото"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Counter badge — top right */}
        {hasMultiple && (
          <div className="absolute top-6 right-6 z-20 bg-black/50 backdrop-blur-sm text-white text-xs font-heading font-700 px-3 py-1.5 rounded-full">
            {currentIdx + 1} / {images.length}
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 sm:px-8 pb-10 max-w-7xl mx-auto">
          {tourType && (
            <span className="inline-block bg-brand-lime text-brand-blue-deeper text-xs font-heading font-800 uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              {TYPE_LABELS[tourType] ?? tourType}
            </span>
          )}
          <h1 className="font-heading font-black text-white text-3xl sm:text-5xl uppercase leading-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* ── Thumbnail strip ── */}
      {hasMultiple && (
        <div className="bg-gray-900 px-4 sm:px-8 pb-4 pt-2">
          <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={`relative w-20 h-14 shrink-0 rounded-lg overflow-hidden transition-all duration-200 ${
                  i === currentIdx
                    ? "ring-2 ring-brand-lime opacity-100"
                    : "opacity-50 hover:opacity-80"
                }`}
                aria-label={`Фото ${i + 1}`}
              >
                <Image
                  src={img}
                  alt={`${title} ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
