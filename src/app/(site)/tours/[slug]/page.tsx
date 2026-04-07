import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import AvailabilityCalendar from "./AvailabilityCalendar";
import ItineraryView from "./ItineraryView";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80",
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80",
];

async function getTour(slug: string) {
  return prisma.tour.findUnique({
    where: { slug, isActive: true },
    include: {
      tourDates: {
        where: { startDate: { gte: new Date() } },
        orderBy: { startDate: "asc" },
        include: { _count: { select: { applications: true } } },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const tour = await getTour(params.slug);
  if (!tour) return { title: "Тур не найден" };
  return {
    title: tour.seoTitle ?? `${tour.title} — Kapriz Travel`,
    description: tour.seoDescription ?? tour.description?.slice(0, 160) ?? "",
  };
}

export default async function TourPage({
  params,
}: {
  params: { slug: string };
}) {
  const tour = await getTour(params.slug);
  if (!tour) notFound();

  const images = Array.isArray(tour.images) ? (tour.images as string[]) : [];
  const displayImages =
    images.length > 0 ? images : PLACEHOLDER_IMAGES;

  const included = Array.isArray(tour.included) ? (tour.included as string[]) : [];
  const notIncluded = Array.isArray(tour.notIncluded) ? (tour.notIncluded as string[]) : [];

  return (
    <div className="bg-white">
      {/* Hero image */}
      <div className="relative h-[55vh] sm:h-[65vh] bg-gray-900">
        <Image
          src={displayImages[0]}
          alt={tour.title}
          fill
          className="object-cover opacity-80"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <Link
          href="/tours"
          className="absolute top-6 left-6 flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-full text-sm font-heading font-700 hover:bg-white/20 transition-colors duration-200 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
          </svg>
          Все туры
        </Link>

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-10 max-w-7xl mx-auto">
          {tour.tourType && (
            <span className="inline-block bg-brand-lime text-brand-blue-deeper text-xs font-heading font-800 uppercase tracking-widest px-3 py-1 rounded-full mb-3">
              {tour.tourType === "day_trip" ? "Однодневный" :
               tour.tourType === "cultural" ? "Культурный" :
               tour.tourType === "adventure" ? "Приключения" :
               tour.tourType === "trekking" ? "Треккинг" : tour.tourType}
            </span>
          )}
          <h1 className="font-heading font-black text-white text-3xl sm:text-5xl uppercase leading-tight">
            {tour.title}
          </h1>
        </div>
      </div>

      {/* Thumbnail strip */}
      {displayImages.length > 1 && (
        <div className="bg-gray-900 px-4 sm:px-8 pb-4">
          <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto">
            {displayImages.slice(1).map((img, i) => (
              <div key={i} className="relative w-20 h-16 shrink-0 rounded-lg overflow-hidden opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                <Image src={img} alt={`${tour.title} ${i + 2}`} fill className="object-cover" sizes="80px" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left: main info */}
          <div className="lg:col-span-2 space-y-12">
            {/* Quick facts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {tour.duration && (
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <div className="text-brand-blue font-heading font-900 text-2xl">{tour.duration}</div>
                  <div className="text-gray-500 text-xs font-heading font-600 uppercase tracking-wide mt-1">
                    {tour.duration === 1 ? "день" : tour.duration <= 4 ? "дня" : "дней"}
                  </div>
                </div>
              )}
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <div className="text-brand-blue font-heading font-900 text-2xl">
                  {tour.minGroupSize}–{tour.maxGroupSize}
                </div>
                <div className="text-gray-500 text-xs font-heading font-600 uppercase tracking-wide mt-1">
                  человек
                </div>
              </div>
              <div className="bg-blue-gradient rounded-2xl p-4 text-center">
                <div className="text-brand-lime font-heading font-900 text-2xl">
                  {tour.basePrice.toLocaleString("ru")}
                </div>
                <div className="text-white/60 text-xs font-heading font-600 uppercase tracking-wide mt-1">
                  сом / чел.
                </div>
              </div>
            </div>

            {/* Description */}
            {tour.description && (
              <div>
                <h2 className="font-heading font-800 text-gray-900 uppercase text-xl mb-4">
                  Описание
                </h2>
                <p className="text-gray-600 leading-relaxed text-base">{tour.description}</p>
              </div>
            )}

            {/* Itinerary */}
            <ItineraryView itinerary={tour.itinerary} title={tour.title} />

            {/* Included / Not included */}
            {(included.length > 0 || notIncluded.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {included.length > 0 && (
                  <div>
                    <h2 className="font-heading font-800 text-gray-900 uppercase text-xl mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      Включено
                    </h2>
                    <ul className="space-y-2">
                      {included.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                          <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {notIncluded.length > 0 && (
                  <div>
                    <h2 className="font-heading font-800 text-gray-900 uppercase text-xl mb-4 flex items-center gap-2">
                      <span className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                      Не включено
                    </h2>
                    <ul className="space-y-2">
                      {notIncluded.map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                          <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Map */}
            {tour.mapEmbed && (
              <div>
                <h2 className="font-heading font-800 text-gray-900 uppercase text-xl mb-4">
                  Карта маршрута
                </h2>
                <div
                  className="rounded-2xl overflow-hidden h-72"
                  dangerouslySetInnerHTML={{ __html: tour.mapEmbed }}
                />
              </div>
            )}
          </div>

          {/* Right: booking sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Price card */}
              <div className="bg-blue-gradient rounded-2xl p-6 text-white">
                <div className="text-white/60 text-sm font-heading uppercase tracking-wider">
                  Стоимость от
                </div>
                <div className="font-heading font-900 text-4xl text-brand-lime mt-1">
                  {tour.basePrice.toLocaleString("ru")}
                  <span className="text-xl font-600 text-white/70 ml-1">сом</span>
                </div>
                <div className="text-white/50 text-xs mt-1">за человека</div>

                <Link
                  href={`/apply?tour=${tour.slug}`}
                  className="mt-6 w-full block bg-brand-lime text-brand-blue-deeper font-heading font-800 uppercase tracking-wider text-center py-4 rounded-xl hover:bg-brand-lime-dark transition-colors duration-200 cursor-pointer"
                >
                  Записаться на тур
                </Link>

                <a
                  href="https://wa.me/996700000000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full flex items-center justify-center gap-2 border border-white/20 text-white font-heading font-700 uppercase tracking-wider text-sm py-3 rounded-xl hover:border-white/40 transition-colors duration-200 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Спросить в WhatsApp
                </a>
              </div>

              {/* Availability calendar */}
              <AvailabilityCalendar tourDates={tour.tourDates} tourSlug={tour.slug} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
