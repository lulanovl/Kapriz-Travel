import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(d: Date, opts?: Intl.DateTimeFormatOptions) {
  return d.toLocaleDateString("ru-RU", opts ?? { day: "numeric", month: "long", year: "numeric" });
}

export default async function GuidePage({
  params,
}: {
  params: { token: string };
}) {
  const guideToken = await prisma.guideToken.findUnique({
    where: { token: params.token },
    include: {
      group: {
        include: {
          departure: {
            include: {
              tour: {
                select: {
                  title: true,
                  description: true,
                  itinerary: true,
                  included: true,
                  notIncluded: true,
                },
              },
            },
          },
          guide: { select: { name: true, phone: true } },
          driver: { select: { name: true, phone: true } },
          applications: {
            where: {
              status: { notIn: ["ARCHIVE", "NO_SHOW"] },
            },
            include: {
              client: {
                select: { name: true, whatsapp: true, country: true },
              },
              booking: {
                select: {
                  finalPrice: true,
                  depositPaid: true,
                  currency: true,
                  paymentStatus: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!guideToken) notFound();

  // Check expiry
  if (new Date() > guideToken.expiresAt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-sm text-center">
          <div className="text-4xl mb-3">⏰</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ссылка устарела</h1>
          <p className="text-gray-500 text-sm">
            Срок действия этой ссылки истёк. Попросите менеджера отправить новую.
          </p>
          <p className="text-xs text-gray-400 mt-3">
            Истекла: {formatDate(guideToken.expiresAt)}
          </p>
        </div>
      </div>
    );
  }

  const group = guideToken.group;
  const departure = group.departure;
  const tour = departure.tour;

  // Parse itinerary JSON
  type ItineraryDay = { day: number; title: string; description: string };
  let itinerary: ItineraryDay[] = [];
  try {
    if (Array.isArray(tour.itinerary)) {
      itinerary = tour.itinerary as ItineraryDay[];
    }
  } catch {
    itinerary = [];
  }

  const participants = group.applications;
  const totalParticipants = participants.reduce((sum, a) => sum + a.persons, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1B4FD8] text-white">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <p className="text-sm text-blue-200 mb-1">Страница гида · {group.name}</p>
          <h1 className="text-2xl font-bold">{tour.title}</h1>
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-blue-100">
            <span>
              📅{" "}
              {formatDate(new Date(departure.departureDate), {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
            <span>👥 {totalParticipants} туристов</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Staff */}
        {(group.guide || group.driver) && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              Команда
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {group.guide && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-500 font-medium">Гид</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {group.guide.name}
                  </p>
                  {group.guide.phone && (
                    <a
                      href={`tel:${group.guide.phone}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {group.guide.phone}
                    </a>
                  )}
                </div>
              )}
              {group.driver && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-500 font-medium">Водитель</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    {group.driver.name}
                  </p>
                  {group.driver.phone && (
                    <a
                      href={`tel:${group.driver.phone}`}
                      className="text-xs text-green-600 hover:underline"
                    >
                      {group.driver.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Participants */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Список туристов
            </h2>
            <span className="text-xs text-gray-400">
              {participants.length} записей · {totalParticipants} чел.
            </span>
          </div>

          {participants.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              Нет подтверждённых участников
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {participants.map((app, idx) => {
                const phone = app.client.whatsapp.replace(/\D/g, "");
                const balance = app.booking
                  ? app.booking.finalPrice - app.booking.depositPaid
                  : null;
                const isPaid = app.booking?.paymentStatus === "PAID";

                return (
                  <div key={app.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-gray-400 w-5 shrink-0">
                          {idx + 1}.
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm">
                              {app.client.name}
                            </span>
                            {app.persons > 1 && (
                              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                {app.persons} чел.
                              </span>
                            )}
                          </div>
                          {app.client.country && (
                            <p className="text-xs text-gray-400">
                              {app.client.country}
                            </p>
                          )}
                          <a
                            href={`https://wa.me/${phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-green-600 hover:underline"
                          >
                            {app.client.whatsapp}
                          </a>
                        </div>
                      </div>

                      {/* Payment info */}
                      <div className="text-right shrink-0">
                        {app.booking ? (
                          <>
                            {isPaid ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                Оплачено
                              </span>
                            ) : balance !== null && balance > 0 ? (
                              <div>
                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                                  Долг
                                </span>
                                <p className="text-sm font-bold text-orange-600 mt-0.5">
                                  {balance.toLocaleString()}{" "}
                                  {app.booking.currency}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-300">Нет брони</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Itinerary */}
        {itinerary.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Программа по дням
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {itinerary.map((day) => (
                <div key={day.day} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-white bg-[#1B4FD8] rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                      {day.day}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {day.title}
                      </p>
                      {day.description && (
                        <p className="text-sm text-gray-500 mt-0.5">
                          {day.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Included / Not included */}
        {(Array.isArray(tour.included) || Array.isArray(tour.notIncluded)) && (
          <div className="grid grid-cols-2 gap-4">
            {Array.isArray(tour.included) && tour.included.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Включено
                </h3>
                <ul className="space-y-1">
                  {(tour.included as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-1.5">
                      <span className="text-green-500 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {Array.isArray(tour.notIncluded) && tour.notIncluded.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Не включено
                </h3>
                <ul className="space-y-1">
                  {(tour.notIncluded as string[]).map((item, i) => (
                    <li key={i} className="text-sm text-gray-700 flex gap-1.5">
                      <span className="text-red-400 shrink-0">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-gray-400">
            Kapriz Travel · Страница действует до{" "}
            {formatDate(guideToken.expiresAt)}
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Read-only · Только для внутреннего использования
          </p>
        </div>
      </div>
    </div>
  );
}
