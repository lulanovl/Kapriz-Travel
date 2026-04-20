"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtraExpense = {
  id: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
};

type ManagerBreakdown = {
  managerId: string;
  managerName: string;
  persons: number;
  profitShare: number;
  salary: number;
};

type DepartureSalary = {
  id: string;
  tourId: string;
  tourTitle: string;
  departureDate: string;
  totalPersons: number;
  unassignedPersons: number;
  revenue: number;
  tourExpenses: number;
  extraExpenses: ExtraExpense[];
  totalExtraExpenses: number;
  netProfit: number;
  adjustedProfit: number;
  lossAdjustment: number;
  managerBreakdown: ManagerBreakdown[];
};

type SalarySummary = {
  managerId: string;
  managerName: string;
  totalPersons: number;
  totalSalary: number;
};

type Totals = {
  revenue: number;
  expenses: number;
  netProfit: number;
  totalSalary: number;
};

type ApiData = {
  departures: DepartureSalary[];
  summary: SalarySummary[];
  totals: Totals;
};

// ─── Date Helpers (copied from ManagersReport) ────────────────────────────────

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekBounds(anchor: Date): { from: string; to: string } {
  const mon = getMonday(anchor);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { from: isoDate(mon), to: isoDate(sun) };
}

function getMonthBounds(anchor: Date): { from: string; to: string } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  return {
    from: isoDate(new Date(y, m, 1)),
    to: isoDate(new Date(y, m + 1, 0)),
  };
}

const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
const MONTH_NAMES_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

function formatPeriodLabel(view: "week" | "month", anchor: Date): string {
  if (view === "week") {
    const { from, to } = getWeekBounds(anchor);
    const f = new Date(from);
    const t = new Date(to);
    if (f.getMonth() === t.getMonth()) {
      return `${f.getDate()} – ${t.getDate()} ${MONTH_NAMES_GEN[f.getMonth()]} ${f.getFullYear()}`;
    }
    return `${f.getDate()} ${MONTH_NAMES_GEN[f.getMonth()]} – ${t.getDate()} ${MONTH_NAMES_GEN[t.getMonth()]} ${t.getFullYear()}`;
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

// ─── Number formatter ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("ru-RU");
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES_GEN[d.getMonth()]}`;
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
function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

// ─── Profit/loss badge ────────────────────────────────────────────────────────

function ProfitBadge({ value }: { value: number }) {
  const isPos = value >= 0;
  return (
    <span className={`font-bold ${isPos ? "text-emerald-600" : "text-red-500"}`}>
      {isPos ? "+" : ""}
      {fmt(value)} сом
    </span>
  );
}

// ─── DepartureCard ────────────────────────────────────────────────────────────

function DepartureCard({
  dep,
  canEdit,
  onRefresh,
}: {
  dep: DepartureSalary;
  canEdit: boolean;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expCurrency, setExpCurrency] = useState("KGS");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAddExpense() {
    if (!expAmount || isNaN(Number(expAmount)) || Number(expAmount) <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/extra-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departureId: dep.id,
          amount: Number(expAmount),
          currency: expCurrency,
          description: expDesc.trim() || "Доп. расход",
        }),
      });
      if (!res.ok) throw new Error("Ошибка сохранения");
      setExpAmount("");
      setExpDesc("");
      setAddingExpense(false);
      onRefresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/admin/extra-expenses/${id}`, { method: "DELETE" });
      onRefresh();
    } finally {
      setDeletingId(null);
    }
  }

  const isLoss = dep.netProfit < 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ── Card header ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 truncate">{dep.tourTitle}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {fmtDate(dep.departureDate)} · {dep.totalPersons} туристов
              {dep.unassignedPersons > 0 && (
                <span className="text-orange-400 ml-1">({dep.unassignedPersons} без менеджера)</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 ml-4">
          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="text-xs text-gray-400">Выручка</p>
              <p className="font-medium text-gray-700">{fmt(dep.revenue)} сом</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Прибыль</p>
              <p className={`font-semibold ${isLoss ? "text-red-500" : "text-emerald-600"}`}>
                {fmt(dep.netProfit)} сом
              </p>
            </div>
          </div>
          <ChevronDown open={open} />
        </div>
      </button>

      {/* ── Expanded body ─────────────────────────────────────────────────── */}
      {open && (
        <div className="border-t border-gray-100">
          <div className="p-5 space-y-5">

            {/* Financial breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Выручка ({dep.totalPersons} чел.)</span>
                <span className="font-medium text-gray-800">{fmt(dep.revenue)} сом</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Расходы на тур</span>
                <span className="font-medium text-red-500">−{fmt(dep.tourExpenses)} сом</span>
              </div>

              {/* Extra expenses list */}
              {dep.extraExpenses.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {dep.extraExpenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2">
                      <span className="text-gray-500 truncate">
                        {e.description || "Доп. расход"}
                        <span className="text-gray-400 ml-1">({e.currency})</span>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium text-red-400">−{fmt(e.amount)} сом</span>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            disabled={deletingId === e.id}
                            className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                            title="Удалить расход"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add extra expense button */}
              {canEdit && !addingExpense && (
                <button
                  onClick={() => setAddingExpense(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 cursor-pointer mt-1 transition-colors"
                >
                  <PlusIcon />
                  Добавить расход (таргет, реклама…)
                </button>
              )}

              {/* Add expense inline form */}
              {canEdit && addingExpense && (
                <div className="pt-2 border-t border-gray-200 space-y-2">
                  <p className="text-xs font-medium text-gray-600">Новый доп. расход</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Описание (таргет, реклама…)"
                      value={expDesc}
                      onChange={(e) => setExpDesc(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Сумма"
                      value={expAmount}
                      min="1"
                      onChange={(e) => setExpAmount(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <select
                      value={expCurrency}
                      onChange={(e) => setExpCurrency(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="KGS">KGS</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <button
                      onClick={handleAddExpense}
                      disabled={saving || !expAmount}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? "…" : "Добавить"}
                    </button>
                    <button
                      onClick={() => { setAddingExpense(false); setExpAmount(""); setExpDesc(""); }}
                      className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}

              {/* Divider and net profit */}
              <div className="pt-2 border-t border-gray-300 flex justify-between font-semibold">
                <span className={isLoss ? "text-red-600" : "text-emerald-700"}>
                  Чистая прибыль
                </span>
                <ProfitBadge value={dep.netProfit} />
              </div>

              {/* Loss deduction from other negative tours */}
              {dep.lossAdjustment > 0 && (
                <div className="flex justify-between text-xs text-orange-600 pt-1">
                  <span>Вычет убытков других туров</span>
                  <span className="font-medium">−{fmt(dep.lossAdjustment)} сом</span>
                </div>
              )}

              {/* Adjusted profit used for salary */}
              {dep.lossAdjustment > 0 && (
                <div className="flex justify-between font-semibold text-sm pt-1 border-t border-orange-200">
                  <span className="text-orange-700">Прибыль для расчёта зарплаты</span>
                  <span className="text-orange-700">{fmt(dep.adjustedProfit)} сом</span>
                </div>
              )}
            </div>

            {/* Manager breakdown table */}
            {dep.managerBreakdown.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Зарплата менеджеров
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Менеджер</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Туристов</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Доля прибыли</th>
                        <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">
                          Зарплата
                          <span className="font-normal text-gray-400 ml-1">(4%)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dep.managerBreakdown.map((m) => (
                        <tr key={m.managerId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2.5 font-medium text-gray-800">{m.managerName}</td>
                          <td className="text-center px-3 py-2.5">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                              {m.persons}
                            </span>
                          </td>
                          <td className="text-right px-3 py-2.5 text-gray-700">{fmt(m.profitShare)} сом</td>
                          <td className="text-right px-3 py-2.5 font-bold text-emerald-700">{fmt(m.salary)} сом</td>
                        </tr>
                      ))}
                      {/* Unassigned row */}
                      {dep.unassignedPersons > 0 && (
                        <tr className="border-b border-gray-100 bg-orange-50/30">
                          <td className="px-3 py-2.5 text-orange-500 text-xs">Без менеджера</td>
                          <td className="text-center px-3 py-2.5 text-orange-400 text-xs">{dep.unassignedPersons}</td>
                          <td className="text-right px-3 py-2.5 text-orange-400 text-xs">
                            {dep.totalPersons > 0 ? fmt(Math.round(dep.netProfit * dep.unassignedPersons / dep.totalPersons)) : 0} сом
                          </td>
                          <td className="text-right px-3 py-2.5 text-orange-400 text-xs">—</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-2">
                Нет подтверждённых бронирований с менеджерами
              </p>
            )}

            {/* Calculation note */}
            {dep.netProfit < 0 && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-600">
                Тур убыточен — убыток ({fmt(Math.abs(dep.netProfit))} сом) равномерно вычитается из прибыльных туров периода.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalaryClient({
  canEdit,
}: {
  canEdit: boolean; // ADMIN / SENIOR_MANAGER / FINANCE
}) {
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(() => new Date());
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bounds = view === "week" ? getWeekBounds(anchor) : getMonthBounds(anchor);
      const res = await fetch(`/api/admin/salary?from=${bounds.from}&to=${bounds.to}`);
      if (!res.ok) throw new Error("Ошибка загрузки");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [view, anchor]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const departures = data?.departures ?? [];
  const summary = data?.summary ?? [];
  const totals = data?.totals;

  return (
    <div className="space-y-6">

      {/* ── Top totals ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Выручка", value: totals?.revenue, color: "text-gray-800" },
          { label: "Расходы", value: totals ? -totals.expenses : undefined, color: "text-red-500" },
          { label: "Чистая прибыль", value: totals?.netProfit, color: totals && totals.netProfit >= 0 ? "text-emerald-600" : "text-red-500" },
          { label: "Зарплата итого", value: totals?.totalSalary, color: "text-blue-600" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            {loading ? (
              <div className="h-7 w-20 bg-gray-100 rounded animate-pulse mt-1" />
            ) : (
              <p className={`text-xl font-bold ${card.color}`}>
                {card.value !== undefined ? fmt(card.value) : "—"} <span className="text-sm font-normal text-gray-400">сом</span>
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
          {(["week", "month"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 font-medium transition-colors cursor-pointer ${
                view === v
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50 border-r border-gray-200"
              }`}
            >
              {v === "week" ? "Неделя" : "Месяц"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAnchor(navigate(view, anchor, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer text-gray-600"
          >
            <ChevronLeft />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[200px] text-center select-none">
            {formatPeriodLabel(view, anchor)}
          </span>
          <button
            onClick={() => setAnchor(navigate(view, anchor, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer text-gray-600"
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

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : departures.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400">Нет выездов за этот период</p>
        </div>
      ) : (
        <>
          {/* ── Departure cards ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Выезды за период — {departures.length} шт.
            </p>
            {departures.map((dep) => (
              <DepartureCard
                key={dep.id}
                dep={dep}
                canEdit={canEdit}
                onRefresh={fetchData}
              />
            ))}
          </div>

          {/* ── Summary table ────────────────────────────────────────────── */}
          {summary.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Итого зарплаты за период
              </p>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                      <th className="text-left px-4 py-3 font-semibold text-gray-600">Менеджер</th>
                      <th className="text-center px-4 py-3 font-semibold text-gray-600">Туристов</th>
                      <th className="text-right px-5 py-3 font-semibold text-gray-600">Зарплата</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((m, i) => (
                      <tr key={m.managerId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {i === 0 && (
                              <svg className="w-4 h-4 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            )}
                            <span className="font-medium text-gray-800">{m.managerName}</span>
                          </div>
                        </td>
                        <td className="text-center px-4 py-3">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                            {m.totalPersons}
                          </span>
                        </td>
                        <td className="text-right px-5 py-3 font-bold text-emerald-700">
                          {fmt(m.totalSalary)} сом
                        </td>
                      </tr>
                    ))}
                    {/* Total */}
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={2} className="px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                        Итого
                      </td>
                      <td className="text-center px-4 py-3 font-bold text-gray-700">
                        {summary.reduce((s, m) => s + m.totalPersons, 0)}
                      </td>
                      <td className="text-right px-5 py-3 font-bold text-emerald-700">
                        {fmt(summary.reduce((s, m) => s + m.totalSalary, 0))} сом
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Formula explanation */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-blue-700 mb-1">Формула расчёта</p>
            <p className="text-xs text-blue-600">
              Зарплата = (Прибыль тура − Вычет убытков) × (туристы менеджера / все туристы) × 4%
            </p>
            <p className="text-xs text-blue-400 mt-1">
              Убытки минусовых туров делятся поровну между всеми прибыльными турами периода.
              Доп. расходы (таргет, реклама) добавляются финансистом к каждому выезду.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
