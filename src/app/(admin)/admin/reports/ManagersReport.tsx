"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ManagerItem = { date: string; persons: number; status: string };
type Manager = {
  id: string;
  name: string;
  role: string;
  items: ManagerItem[];
  totalPersons: number;
  totalApplications: number;
};
type ApiData = { managers: Manager[] };

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Returns the Monday of the week containing `date` */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns 7 Date objects Mon–Sun for the week containing `anchor` */
function getWeekDays(anchor: Date): Date[] {
  const mon = getMonday(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

/** Returns weeks (as arrays of 7 days Mon–Sun) that overlap with `anchor`'s month */
function getMonthWeeks(anchor: Date): { label: string; days: Date[] }[] {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const weeks: { label: string; days: Date[] }[] = [];
  let weekStart = getMonday(firstDay);

  while (weekStart <= lastDay) {
    const days: Date[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
    const weekEnd = days[6];

    if (weekEnd >= firstDay && weekStart <= lastDay) {
      const startInMonth = weekStart < firstDay ? firstDay : weekStart;
      const endInMonth = weekEnd > lastDay ? lastDay : weekEnd;
      weeks.push({
        label: `${startInMonth.getDate()}–${endInMonth.getDate()}`,
        days,
      });
    }

    weekStart = new Date(weekStart);
    weekStart.setDate(weekStart.getDate() + 7);
  }

  return weeks;
}

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function formatPeriodLabel(view: "week" | "month", anchor: Date): string {
  if (view === "week") {
    const days = getWeekDays(anchor);
    const mon = days[0];
    const sun = days[6];
    if (mon.getMonth() === sun.getMonth()) {
      return `${mon.getDate()} – ${sun.getDate()} ${MONTH_NAMES[mon.getMonth()]} ${mon.getFullYear()}`;
    }
    return `${mon.getDate()} ${MONTH_NAMES[mon.getMonth()]} – ${sun.getDate()} ${MONTH_NAMES[sun.getMonth()]} ${sun.getFullYear()}`;
  }
  return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;
}

function navigate(view: "week" | "month", anchor: Date, dir: -1 | 1): Date {
  const d = new Date(anchor);
  if (view === "week") {
    d.setDate(d.getDate() + dir * 7);
  } else {
    d.setMonth(d.getMonth() + dir);
  }
  return d;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12M15 7a3 3 0 11-6 0 3 3 0 016 0zM21 5h-2V3H5v2H3a2 2 0 000 4h1.22a7.003 7.003 0 0013.56 0H21a2 2 0 000-4z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.768-.231-1.48-.634-2.073M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.768.231-1.48.634-2.073m0 0A5.002 5.002 0 0112 11a5.002 5.002 0 014.366 6.927M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ManagersReport() {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let from: string, to: string;
      if (view === "week") {
        const days = getWeekDays(anchor);
        from = isoDate(days[0]);
        to = isoDate(days[6]);
      } else {
        const y = anchor.getFullYear();
        const m = anchor.getMonth();
        from = isoDate(new Date(y, m, 1));
        to = isoDate(new Date(y, m + 1, 0));
      }
      const res = await fetch(`/api/admin/reports/managers?from=${from}&to=${to}`);
      if (!res.ok) throw new Error("Ошибка загрузки");
      const json: ApiData = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [view, anchor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Build columns ──────────────────────────────────────────────────────────
  const columns: { label: string; sublabel?: string; dates: string[] }[] = [];
  if (view === "week") {
    getWeekDays(anchor).forEach((d, i) => {
      columns.push({ label: DAY_NAMES[i], sublabel: String(d.getDate()), dates: [isoDate(d)] });
    });
  } else {
    getMonthWeeks(anchor).forEach((w) => {
      columns.push({ label: w.label, dates: w.days.map(isoDate) });
    });
  }

  // ─── Cell value ─────────────────────────────────────────────────────────────
  function getCell(manager: Manager, dates: string[]): number {
    return manager.items
      .filter((i) => dates.includes(i.date))
      .reduce((s, i) => s + i.persons, 0);
  }

  // ─── Derived stats ──────────────────────────────────────────────────────────
  const sorted = data
    ? [...data.managers].sort((a, b) => b.totalPersons - a.totalPersons)
    : [];
  const totalPersons = sorted.reduce((s, m) => s + m.totalPersons, 0);
  const totalApps = sorted.reduce((s, m) => s + m.totalApplications, 0);
  const topManager = sorted.find((m) => m.totalPersons > 0);

  // ─── Today highlight ────────────────────────────────────────────────────────
  const todayStr = isoDate(new Date());

  return (
    <div className="space-y-5">

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total persons */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <UsersIcon />
          </div>
          <div>
            <p className="text-xs text-gray-500">Туристов за период</p>
            {loading ? (
              <div className="h-7 w-12 bg-gray-100 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{totalPersons}</p>
            )}
          </div>
        </div>

        {/* Total applications */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500">Подтверждённых заявок</p>
            {loading ? (
              <div className="h-7 w-12 bg-gray-100 rounded animate-pulse mt-1" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{totalApps}</p>
            )}
          </div>
        </div>

        {/* Top manager */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <TrophyIcon />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Лучший менеджер</p>
            {loading ? (
              <div className="h-7 w-24 bg-gray-100 rounded animate-pulse mt-1" />
            ) : topManager ? (
              <>
                <p className="text-base font-bold text-gray-900 truncate">{topManager.name}</p>
                <p className="text-xs text-gray-500">{topManager.totalPersons} чел. · {topManager.totalApplications} заявок</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Нет данных</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
          <button
            onClick={() => setView("week")}
            className={`px-4 py-2 font-medium transition-colors cursor-pointer ${
              view === "week"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Неделя
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-4 py-2 font-medium border-l border-gray-200 transition-colors cursor-pointer ${
              view === "month"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Месяц
          </button>
        </div>

        {/* Period navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor(navigate(view, anchor, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer text-gray-600"
            aria-label="Предыдущий период"
          >
            <ChevronLeft />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[210px] text-center select-none">
            {formatPeriodLabel(view, anchor)}
          </span>
          <button
            onClick={() => setAnchor(navigate(view, anchor, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer text-gray-600"
            aria-label="Следующий период"
          >
            <ChevronRight />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-gray-600"
          >
            Сегодня
          </button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-500 text-sm">{error}</div>
        ) : loading ? (
          <div className="p-10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || sorted.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Нет данных за этот период</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-44 whitespace-nowrap">
                    Менеджер
                  </th>
                  {columns.map((col, i) => {
                    const isToday = view === "week" && col.dates[0] === todayStr;
                    return (
                      <th
                        key={i}
                        className={`text-center px-3 py-3 min-w-[52px] ${
                          isToday ? "bg-blue-50 text-blue-700" : "text-gray-600"
                        }`}
                      >
                        <div className="font-semibold">{col.label}</div>
                        {col.sublabel && (
                          <div className={`text-xs font-normal mt-0.5 ${isToday ? "text-blue-500" : "text-gray-400"}`}>
                            {col.sublabel}
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th className="text-center px-4 py-3 font-semibold text-blue-700 bg-blue-50 whitespace-nowrap min-w-[70px]">
                    Итого
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((manager, rowIdx) => (
                  <tr
                    key={manager.id}
                    className={`border-b border-gray-100 transition-colors hover:bg-gray-50 ${
                      rowIdx === 0 && manager.totalPersons > 0 ? "bg-amber-50/40" : ""
                    }`}
                  >
                    {/* Manager name cell */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {rowIdx === 0 && manager.totalPersons > 0 && (
                          <span className="text-amber-500" title="Лучший менеджер">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </span>
                        )}
                        <span className="font-medium text-gray-800">{manager.name}</span>
                      </div>
                    </td>

                    {/* Day/week cells */}
                    {columns.map((col, i) => {
                      const val = getCell(manager, col.dates);
                      const isToday = view === "week" && col.dates[0] === todayStr;
                      return (
                        <td
                          key={i}
                          className={`text-center px-3 py-3 ${isToday ? "bg-blue-50/50" : ""}`}
                        >
                          {val > 0 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                              {val}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-base">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Total cell */}
                    <td className="text-center px-4 py-3 bg-blue-50/70">
                      {manager.totalPersons > 0 ? (
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 h-8 rounded-full bg-blue-600 text-white font-bold text-xs">
                          {manager.totalPersons}
                        </span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                  </tr>
                ))}

                {/* ── Total row ────────────────────────────────────────────── */}
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <td className="px-4 py-3 text-gray-600 text-xs uppercase tracking-wide">
                    Итого
                  </td>
                  {columns.map((col, i) => {
                    const val = sorted.reduce((sum, m) => sum + getCell(m, col.dates), 0);
                    const isToday = view === "week" && col.dates[0] === todayStr;
                    return (
                      <td
                        key={i}
                        className={`text-center px-3 py-3 font-bold text-gray-700 ${isToday ? "bg-blue-50/50" : ""}`}
                      >
                        {val > 0 ? val : <span className="text-gray-300 font-normal">—</span>}
                      </td>
                    );
                  })}
                  <td className="text-center px-4 py-3 bg-blue-50 font-bold text-blue-700">
                    {totalPersons}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <p className="text-xs text-gray-400">
        Учитываются заявки со статусом «Предоплата» и выше, созданные в выбранный период.
      </p>
    </div>
  );
}
