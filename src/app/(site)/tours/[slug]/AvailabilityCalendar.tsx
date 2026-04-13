"use client";

import Link from "next/link";

interface Group {
  maxSeats: number;
  _count: { applications: number };
}

interface Departure {
  id: string;
  departureDate: Date;
  status: string;
  note: string | null;
  _count: { applications: number };
  groups: Group[];
}

export default function AvailabilityCalendar({
  departures,
  tourSlug,
}: {
  departures: Departure[];
  tourSlug: string;
}) {
  if (departures.length === 0) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 text-center">
        <div className="font-heading font-700 text-gray-500 text-sm uppercase tracking-wide">
          Нет доступных дат
        </div>
        <p className="text-gray-400 text-xs mt-2">
          Напишите нам — организуем тур под вашу группу
        </p>
        <a
          href="https://wa.me/996700000000"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-brand-blue font-heading font-700 text-sm underline underline-offset-2 cursor-pointer"
        >
          Написать в WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-6">
      <h3 className="font-heading font-800 text-gray-900 uppercase text-base mb-4">
        Ближайшие даты
      </h3>
      <div className="space-y-3">
        {departures.slice(0, 5).map((dep) => {
          // Calculate seats: if groups exist, sum group seats; else no limit shown
          const totalGroupSeats = dep.groups.reduce((s, g) => s + g.maxSeats, 0);
          const groupApplications = dep.groups.reduce((s, g) => s + g._count.applications, 0);
          const hasGroups = dep.groups.length > 0;

          const booked = hasGroups ? groupApplications : dep._count.applications;
          const maxSeats = totalGroupSeats;
          const remaining = hasGroups ? maxSeats - booked : null;

          let statusColor = "bg-green-500";
          let statusText = remaining !== null ? `${remaining} мест` : "Есть места";
          let textColor = "text-green-700";
          let bgBar = "bg-green-100";
          let pct = hasGroups && maxSeats > 0 ? Math.round((booked / maxSeats) * 100) : 30;

          if (remaining !== null && remaining <= 0) {
            statusColor = "bg-red-500";
            statusText = "Мест нет";
            textColor = "text-red-700";
            bgBar = "bg-red-100";
            pct = 100;
          } else if (remaining !== null && remaining <= 2) {
            statusColor = "bg-yellow-500";
            statusText = `${remaining} места`;
            textColor = "text-yellow-700";
            bgBar = "bg-yellow-100";
          }

          const dateStr = new Date(dep.departureDate).toLocaleDateString("ru-RU", {
            weekday: "short",
            day: "numeric",
            month: "long",
          });

          const isFull = remaining !== null && remaining <= 0;

          return (
            <div key={dep.id} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="font-heading font-700 text-gray-900 text-sm capitalize">
                  {dateStr}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                  <span className={`text-xs font-heading font-700 ${textColor}`}>
                    {statusText}
                  </span>
                </div>
              </div>

              {dep.note && (
                <p className="text-xs text-gray-400 mb-2">{dep.note}</p>
              )}

              {/* Progress bar (only if groups configured) */}
              {hasGroups && (
                <div className={`h-1.5 rounded-full ${bgBar}`}>
                  <div
                    className={`h-full rounded-full ${statusColor} transition-all duration-500`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              )}

              {isFull ? (
                <Link
                  href={`/apply?tour=${tourSlug}&departure=${dep.id}&waitlist=1`}
                  className="mt-3 block text-center text-xs font-heading font-700 text-brand-blue uppercase tracking-wide underline underline-offset-2 cursor-pointer"
                >
                  Лист ожидания
                </Link>
              ) : (
                <Link
                  href={`/apply?tour=${tourSlug}&departure=${dep.id}`}
                  className="mt-3 block text-center text-xs font-heading font-700 bg-brand-blue text-white py-2 rounded-lg hover:bg-brand-blue-dark transition-colors duration-200 cursor-pointer uppercase tracking-wide"
                >
                  Выбрать эту дату
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
