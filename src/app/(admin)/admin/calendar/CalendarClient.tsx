"use client";

import { useState, useMemo } from "react";

type TourDate = {
  id: string;
  startDate: string;
  endDate: string;
  maxSeats: number;
  tour: { title: string };
  guide: { name: string } | null;
  driver: { name: string } | null;
  applicationsCount: number;
};

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_RU = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];
const WEEKDAYS_FULL = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];

function toLocalDateStr(d: Date) {
  // YYYY-MM-DD in local time
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// Returns true if tourDate spans the given calendar day
function tourOnDay(td: TourDate, day: Date) {
  const start = new Date(td.startDate);
  const end = new Date(td.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return day >= start && day <= end;
}

function TourCard({ td, compact = false }: { td: TourDate; compact?: boolean }) {
  const free = td.maxSeats - td.applicationsCount;
  const pct = td.maxSeats > 0 ? Math.round((td.applicationsCount / td.maxSeats) * 100) : 0;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-yellow-500" : "bg-green-500";
  const freeColor = free <= 0 ? "text-red-600" : free <= 3 ? "text-yellow-600" : "text-green-600";

  const start = new Date(td.startDate);
  const end = new Date(td.endDate);
  const dateStr = start.toLocaleDateString("ru", { day: "numeric", month: "short" }) +
    (isSameDay(start, end) ? "" : " — " + end.toLocaleDateString("ru", { day: "numeric", month: "short" }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
      <p className="font-semibold text-gray-900 text-sm leading-tight">{td.tour.title}</p>
      {!compact && (
        <p className="text-xs text-gray-400 mt-0.5">{dateStr}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-3 text-xs text-gray-400">
          {td.guide && <span>Гид: {td.guide.name}</span>}
          {td.driver && <span>Водитель: {td.driver.name}</span>}
          {!td.guide && !td.driver && <span className="text-gray-300">Нет команды</span>}
        </div>
        <span className={`text-xs font-medium ${freeColor}`}>
          {td.applicationsCount}/{td.maxSeats}
          {free <= 0 ? " • полный" : ` • св. ${free}`}
        </span>
      </div>
      <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CalendarClient({ tourDates }: { tourDates: TourDate[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Set of day strings that have tours — for dot indicators on calendar
  const daysWithTours = useMemo(() => {
    const set = new Set<string>();
    tourDates.forEach((td) => {
      const start = new Date(td.startDate);
      const end = new Date(td.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const cur = new Date(start);
      while (cur <= end) {
        set.add(toLocalDateStr(cur));
        cur.setDate(cur.getDate() + 1);
      }
    });
    return set;
  }, [tourDates]);

  // Tours for selected day (day view)
  const toursForDay = useMemo(() => {
    return tourDates.filter((td) => tourOnDay(td, selectedDate));
  }, [tourDates, selectedDate]);

  // Tours grouped by day for week view
  const weekDays = useMemo(() => {
    const mon = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(mon, i);
      return {
        date: day,
        tours: tourDates.filter((td) => tourOnDay(td, day)),
      };
    });
  }, [tourDates, selectedDate]);

  // Build calendar grid for current month
  const calendarGrid = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from Monday of the week containing firstDay
    const gridStart = startOfWeek(firstDay);
    // End at Sunday of the week containing lastDay
    const gridEndBase = new Date(lastDay);
    const endDow = gridEndBase.getDay();
    const endDiff = endDow === 0 ? 0 : 7 - endDow;
    const gridEnd = addDays(gridEndBase, endDiff);

    const days: Date[] = [];
    const cur = new Date(gridStart);
    while (cur <= gridEnd) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [calMonth]);

  const prevMonth = () => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const selectDay = (day: Date) => {
    setSelectedDate(day);
    // sync calendar month if needed
    if (day.getMonth() !== calMonth.getMonth() || day.getFullYear() !== calMonth.getFullYear()) {
      setCalMonth(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  };

  const weekLabel = useMemo(() => {
    const mon = weekDays[0].date;
    const sun = weekDays[6].date;
    return mon.toLocaleDateString("ru", { day: "numeric", month: "long" }) +
      " — " + sun.toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
  }, [weekDays]);

  return (
    <div className="p-6 flex gap-6">
      {/* LEFT: mini calendar */}
      <div className="shrink-0 w-72">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-800">
              {MONTHS_RU[calMonth.getMonth()]} {calMonth.getFullYear()}
            </span>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarGrid.map((day, i) => {
              const isCurrentMonth = day.getMonth() === calMonth.getMonth();
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);
              const isInSelectedWeek = view === "week" &&
                weekDays.some((wd) => isSameDay(wd.date, day));
              const hasTours = daysWithTours.has(toLocalDateStr(day));

              return (
                <button
                  key={i}
                  onClick={() => selectDay(day)}
                  className={`
                    relative flex flex-col items-center py-1 rounded-lg text-xs transition-colors
                    ${!isCurrentMonth ? "text-gray-300" : "text-gray-700"}
                    ${isSelected ? "bg-blue-600 text-white" : ""}
                    ${isInSelectedWeek && !isSelected ? "bg-blue-50" : ""}
                    ${isToday && !isSelected ? "font-bold ring-1 ring-blue-400" : ""}
                    ${!isSelected && isCurrentMonth ? "hover:bg-gray-100" : ""}
                  `}
                >
                  <span>{day.getDate()}</span>
                  {hasTours && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-blue-500"}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Jump to today */}
          <button
            onClick={() => selectDay(today)}
            className="mt-3 w-full text-xs text-blue-600 hover:text-blue-800 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            Сегодня
          </button>
        </div>

        {/* Legend */}
        <div className="mt-3 bg-white rounded-xl border border-gray-200 p-3 space-y-1.5">
          <p className="text-xs font-medium text-gray-500 mb-2">Заполненность</p>
          {[
            { color: "bg-green-500", label: "Менее 60% мест занято" },
            { color: "bg-yellow-500", label: "60–89% мест занято" },
            { color: "bg-red-500", label: "90%+ мест занято" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-gray-500">
              <span className={`w-3 h-1.5 rounded-full ${item.color}`} />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: content */}
      <div className="flex-1 min-w-0">
        {/* View toggle + label */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {view === "day" ? (
              <h2 className="text-lg font-bold text-gray-900">
                {selectedDate.toLocaleDateString("ru", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </h2>
            ) : (
              <h2 className="text-lg font-bold text-gray-900">{weekLabel}</h2>
            )}
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setView("day")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === "day"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              День
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                view === "week"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Неделя
            </button>
          </div>
        </div>

        {/* DAY VIEW */}
        {view === "day" && (
          <div>
            {toursForDay.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-sm">Туров в этот день нет</p>
              </div>
            ) : (
              <div className="space-y-3">
                {toursForDay.map((td) => (
                  <TourCard key={td.id} td={td} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* WEEK VIEW */}
        {view === "week" && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(({ date, tours }, i) => {
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selectedDate);

              return (
                <div key={i} className="flex flex-col min-h-[120px]">
                  {/* Day header */}
                  <button
                    onClick={() => {
                      setSelectedDate(date);
                      setView("day");
                    }}
                    className={`
                      mb-2 py-1.5 px-2 rounded-lg text-center transition-colors
                      ${isSelected ? "bg-blue-600 text-white" : isToday ? "bg-blue-50 text-blue-700 ring-1 ring-blue-300" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}
                    `}
                  >
                    <p className="text-xs font-semibold">{WEEKDAYS_FULL[i].slice(0, 2)}</p>
                    <p className={`text-lg font-bold leading-tight ${isSelected ? "text-white" : isToday ? "text-blue-700" : "text-gray-800"}`}>
                      {date.getDate()}
                    </p>
                    <p className="text-xs opacity-70">
                      {date.toLocaleDateString("ru", { month: "short" })}
                    </p>
                  </button>

                  {/* Tour cards */}
                  <div className="flex-1 space-y-1.5">
                    {tours.length === 0 ? (
                      <div className="h-full min-h-[60px] border border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-300">—</span>
                      </div>
                    ) : (
                      tours.map((td) => (
                        <TourCard key={td.id} td={td} compact />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
