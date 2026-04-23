import Link from "next/link";
import TourCard from "./TourCard";

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

export default function PopularTours({ tours }: { tours: Tour[] }) {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <span className="text-brand-blue font-heading font-700 text-sm uppercase tracking-widest">
              Наши туры
            </span>
            <h2 className="font-heading font-black text-3xl sm:text-4xl text-gray-900 uppercase mt-1">
              Популярные маршруты
            </h2>
          </div>
          <Link
            href="/tours"
            className="inline-flex items-center gap-2 text-brand-blue font-heading font-700 text-sm uppercase tracking-wider hover:gap-3 transition-all duration-200 cursor-pointer shrink-0"
          >
            Все туры
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tours.map((tour, i) => (
            <TourCard key={tour.id} tour={tour} index={i} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="https://wa.me/996508100210"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-brand-blue text-white font-heading font-800 uppercase tracking-wider text-sm px-8 py-4 rounded-full hover:bg-brand-blue-dark transition-colors duration-200 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Не нашли нужный тур? Напишите нам
          </a>
        </div>
      </div>
    </section>
  );
}
