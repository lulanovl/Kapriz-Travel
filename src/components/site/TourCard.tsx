import Link from "next/link";
import Image from "next/image";

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
    departures?: {
      id: string;
      departureDate: Date | string;
    }[];
  };
  index?: number;
}

export default function TourCard({ tour, index = 0 }: TourCardProps) {
  const images = Array.isArray(tour.images) ? tour.images as string[] : [];
  const imageUrl = images[0] ?? PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];

  const nextDeparture = tour.departures?.[0];
  const hasUpcoming = !!nextDeparture;

  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-52 overflow-hidden">
        <Image
          src={imageUrl}
          alt={tour.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {/* Type badge */}
        {tour.tourType && (
          <div className="absolute top-3 left-3 bg-brand-blue/90 backdrop-blur-sm text-white text-xs font-heading font-700 uppercase tracking-wider px-3 py-1 rounded-full">
            {TYPE_LABELS[tour.tourType] ?? tour.tourType}
          </div>
        )}
        {/* Duration */}
        {tour.duration && (
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs font-heading font-600 px-3 py-1 rounded-full">
            {tour.duration} {tour.duration === 1 ? "день" : tour.duration <= 4 ? "дня" : "дней"}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-heading font-800 text-gray-900 text-base leading-tight line-clamp-2 group-hover:text-brand-blue transition-colors duration-200">
          {tour.title}
        </h3>

        <div className="flex items-center justify-between mt-4">
          <div>
            <span className="text-xs text-gray-400 font-heading uppercase tracking-wider">от</span>
            <div className="font-heading font-900 text-brand-blue text-xl">
              {tour.basePrice.toLocaleString("ru")} <span className="text-sm font-600">сом</span>
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
    </Link>
  );
}
