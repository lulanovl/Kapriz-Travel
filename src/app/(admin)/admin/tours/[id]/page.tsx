import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/admin/Header";
import TourDatesManager from "@/components/admin/tours/TourDatesManager";
import TourEditClient from "@/components/admin/tours/TourEditClient";

const TOUR_TYPE_LABELS: Record<string, string> = {
  trekking: "Треккинг",
  relax: "Отдых",
  cultural: "Культурный",
  adventure: "Приключения",
  day_trip: "Однодневный",
  ski: "Горнолыжный",
};

export default async function TourDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  const canEdit = ["ADMIN", "SENIOR_MANAGER"].includes(session?.user.role ?? "");

  const tour = await prisma.tour.findUnique({
    where: { id: params.id },
    include: {
      tourDates: {
        include: {
          guide: true,
          driver: true,
          _count: { select: { applications: true } },
        },
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!tour) notFound();

  const itinerary = (tour.itinerary as { day: number; title: string; description: string }[]) ?? [];
  const included = (tour.included as string[]) ?? [];
  const notIncluded = (tour.notIncluded as string[]) ?? [];
  const images = (tour.images as string[]) ?? [];

  return (
    <>
      <Header title={tour.title} />
      <div className="flex-1 p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/tours" className="hover:text-blue-600">
            Туры
          </Link>
          <span>/</span>
          <span className="text-gray-800">{tour.title}</span>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: info + edit */}
          <div className="col-span-2 space-y-6">
            {canEdit ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <TourEditClient tour={{
                  ...tour,
                  duration: tour.duration ?? undefined,
                  tourType: tour.tourType ?? undefined,
                  description: tour.description ?? undefined,
                  mapEmbed: tour.mapEmbed ?? undefined,
                  seoTitle: tour.seoTitle ?? undefined,
                  seoDescription: tour.seoDescription ?? undefined,
                  itinerary,
                  included,
                  notIncluded,
                  images,
                }} />
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Описание</p>
                  <p className="text-sm text-gray-700">{tour.description || "—"}</p>
                </div>
                {itinerary.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Программа</p>
                    <div className="space-y-2">
                      {itinerary.map((day) => (
                        <div key={day.day} className="flex gap-3">
                          <span className="text-xs font-bold text-blue-600 w-12 shrink-0">
                            День {day.day}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{day.title}</p>
                            <p className="text-xs text-gray-500">{day.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <TourDatesManager
                tourId={tour.id}
                initialDates={tour.tourDates.map((d) => ({
                  ...d,
                  startDate: d.startDate.toISOString(),
                  endDate: d.endDate.toISOString(),
                  guide: d.guide ? { id: d.guide.id, name: d.guide.name } : null,
                  driver: d.driver ? { id: d.driver.id, name: d.driver.name } : null,
                }))}
              />
            </div>
          </div>

          {/* Right: meta */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Информация</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Статус</dt>
                  <dd>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      tour.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {tour.isActive ? "Активен" : "Неактивен"}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Тип</dt>
                  <dd className="font-medium">{TOUR_TYPE_LABELS[tour.tourType ?? ""] ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Длительность</dt>
                  <dd className="font-medium">{tour.duration ? `${tour.duration} дн.` : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Базовая цена</dt>
                  <dd className="font-medium">{tour.basePrice.toLocaleString("ru-RU")} сом</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Группа</dt>
                  <dd className="font-medium">{tour.minGroupSize}–{tour.maxGroupSize} чел.</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Slug</dt>
                  <dd className="font-mono text-xs text-gray-600">{tour.slug}</dd>
                </div>
              </dl>
            </div>

            {included.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-green-700 mb-3">Включено</h3>
                <ul className="space-y-1">
                  {included.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-green-500 shrink-0">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {notIncluded.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-red-600 mb-3">Не включено</h3>
                <ul className="space-y-1">
                  {notIncluded.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-red-400 shrink-0">✕</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
