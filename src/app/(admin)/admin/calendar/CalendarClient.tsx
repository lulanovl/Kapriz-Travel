"use client";

import { useState, useMemo } from "react";

type Departure = {
  id: string;
  departureDate: string;
  tour: { id: string; title: string };
  applicationsCount: number;
  maxSeats: number;
  guide: { name: string } | null;
  driver: { name: string } | null;
  groupCount: number;
};

const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS_RU = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь",
];
const WEEKDAYS_FULL = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
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

function depOnDay(dep: Departure, day: Date) {
  const depDate = new Date(dep.departureDate);
  return isSameDay(depDate, day);
}

function DepartureCard({ dep, compact = false }: { dep: Departure; compact?: boolean }) {
  const hasGroups = dep.groupCount > 0;
  const pct = hasGroups && dep.maxSeats > 0
    ? Math.round((dep.applicationsCount / dep.maxSeats) * 100)
    : 0;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-yellow-500" : "bg-green-500";
  const countColor = dep.applicationsCount === 0 ? "text-gray-400" : pct >= 90 ? "text-red-600" : "text-green-600";

  return (
    <a
      href={`/admin/departures/${dep.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    >
      <p className="font-semibold text-gray-900 text-xs leading-snug mb-1 line-clamp-2">
        {dep.tour.title}
      </p>

      {!compact && (
        <p className="text-xs text-gray-400 mb-1.5">
          {new Date(dep.departureDate).toLocaleDateString("ru", {
            weekday: "short", day: "numeric", month: "short",
          })}
        </p>
      )}

      <div className={`text-xs font-semibold ${countColor} mb-1`}>
        {dep.applicationsCount} чел.
        {hasGroups && dep.maxSeats > 0 && ` / ${dep.maxSeats} мест`}
        {dep.groupCount > 1 && ` · ${dep.groupCount} групп`}
      </div>

      {hasGroups && dep.maxSeats > 0 && (
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1.5">
          <div className={`h-full ${barColor} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}

      {(dep.guide || dep.driver) && (
        <div className="space-y-0.5">
          {dep.guide && (
            <p className="text-xs text-gray-400 truncate">
              <span className="text-gray-300">Гид: </span>{dep.guide.name}
            </p>
          )}
          {dep.driver && (
            <p className="text-xs text-gray-400 truncate">
              <span className="text-gray-300">Вод: </span>{dep.driver.name}
            </p>
          )}
        </div>
      )}
    </a>
  );
}

export default function CalendarClient({ departures }: { departures: Departure[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [view, setView] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const daysWithDepartures = useMemo(() => {
    const set = new Set<string>();
    departures.forEach((dep) => {
      const d = new Date(dep.departureDate);
      set.add(toLocalDateStr(d));
    });
    return set;
  }, [departures]);

  const departuresForDay = useMemo(() => {
    return departures.filter((dep) => depOnDay(dep, selectedDate));
  }, [departures, selectedDate]);

  const weekDays = useMemo(() => {
    const mon = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(mon, i);
      return {
        date: day,
        deps: departures.filter((dep) => depOnDay(dep, day)),
      };
    });
  }, [departures, selectedDate]);

  const calendarGrid = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const gridStart = startOfWeek(firstDay);
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

          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarGrid.map((day, i) => {
              const isCurrentMonth = day.getMonth() === calMonth.getMonth();
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selectedDate);
              const isInSelectedWeek = view === "week" &&
                weekDays.some((wd) => isSameDay(wd.date, day));
              const hasDeps = daysWithDepartures.has(toLocalDateStr(day));

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
                  {hasDeps && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-blue-500"}`} />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => selectDay(today)}
            className="mt-3 w-full text-xs text-blue-600 hover:text-blue-800 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            Сегодня
          </button>
        </div>

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
                view === "day" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              День
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200 ${
                view === "week" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Неделя
            </button>
          </div>
        </div>

        {view === "day" && (
          <div>
            {departuresForDay.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-sm">Выездов в этот день нет</p>
              </div>
            ) : (
              <div className="space-y-3">
                {departuresForDay.map((dep) => (
                  <DepartureCard key={dep.id} dep={dep} />
                ))}
              </div>
            )}
          </div>
        )}

        {view === "week" && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(({ date, deps }, i) => {
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selectedDate);

              return (
                <div key={i} className="flex flex-col min-h-[120px]">
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

                  <div className="flex-1 space-y-1.5">
                    {deps.length === 0 ? (
                      <div className="h-full min-h-[60px] border border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-300">—</span>
                      </div>
                    ) : (
                      deps.map((dep) => (
                        <DepartureCard key={dep.id} dep={dep} compact />
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
