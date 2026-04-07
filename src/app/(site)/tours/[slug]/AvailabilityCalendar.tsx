"use client";

import Link from "next/link";

interface TourDate {
  id: string;
  startDate: Date;
  endDate: Date;
  maxSeats: number;
  _count: { applications: number };
}

export default function AvailabilityCalendar({
  tourDates,
  tourSlug,
}: {
  tourDates: TourDate[];
  tourSlug: string;
}) {
  if (tourDates.length === 0) {
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
        {tourDates.slice(0, 5).map((d) => {
          const booked = d._count.applications;
          const remaining = d.maxSeats - booked;
          const pct = Math.round((booked / d.maxSeats) * 100);

          let statusColor = "bg-green-500";
          let statusText = `${remaining} мест`;
          let textColor = "text-green-700";
          let bgBar = "bg-green-100";

          if (remaining <= 0) {
            statusColor = "bg-red-500";
            statusText = "Мест нет";
            textColor = "text-red-700";
            bgBar = "bg-red-100";
          } else if (remaining <= 2) {
            statusColor = "bg-yellow-500";
            statusText = `${remaining} места`;
            textColor = "text-yellow-700";
            bgBar = "bg-yellow-100";
          }

          const start = new Date(d.startDate);
          const end = new Date(d.endDate);
          const startStr = start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
          const endStr = end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

          return (
            <div key={d.id} className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="font-heading font-700 text-gray-900 text-sm">
                  {startStr} — {endStr}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                  <span className={`text-xs font-heading font-700 ${textColor}`}>
                    {statusText}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className={`h-1.5 rounded-full ${bgBar}`}>
                <div
                  className={`h-full rounded-full ${statusColor} transition-all duration-500`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              {remaining <= 0 ? (
                <Link
                  href={`/apply?tour=${tourSlug}&waitlist=1`}
                  className="mt-3 block text-center text-xs font-heading font-700 text-brand-blue uppercase tracking-wide underline underline-offset-2 cursor-pointer"
                >
                  Лист ожидания
                </Link>
              ) : (
                <Link
                  href={`/apply?tour=${tourSlug}&date=${d.id}`}
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
