"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Schedule {
  id: string;
  type: "WEEKLY" | "DATE_RANGE";
  daysOfWeek: number[];
  rangeStart: string | null;
  rangeEnd: string | null;
  note: string | null;
  isActive: boolean;
}

interface Props {
  tourId: string;
  initialSchedules: Schedule[];
}

const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const DAY_NAMES_FULL = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

function formatSchedule(s: Schedule): string {
  if (s.type === "WEEKLY") {
    const days = [...s.daysOfWeek].sort().map((d) => DAY_NAMES[d]).join(", ");
    return `Каждые: ${days}`;
  }
  if (s.rangeStart && s.rangeEnd) {
    const start = new Date(s.rangeStart).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    const end = new Date(s.rangeEnd).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    return `${start} — ${end} (каждый день)`;
  }
  return "Особый диапазон дат";
}

const emptyWeekly = { daysOfWeek: [] as number[], note: "" };
const emptyRange = { rangeStart: "", rangeEnd: "", note: "" };

export default function TourScheduleManager({ tourId, initialSchedules }: Props) {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"WEEKLY" | "DATE_RANGE">("WEEKLY");
  const [weeklyForm, setWeeklyForm] = useState(emptyWeekly);
  const [rangeForm, setRangeForm] = useState(emptyRange);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleDay(day: number) {
    setWeeklyForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter((d) => d !== day)
        : [...f.daysOfWeek, day],
    }));
  }

  function cancelForm() {
    setShowForm(false);
    setWeeklyForm(emptyWeekly);
    setRangeForm(emptyRange);
    setError("");
  }

  async function handleSave() {
    setError("");
    if (formType === "WEEKLY" && weeklyForm.daysOfWeek.length === 0) {
      setError("Выберите хотя бы один день недели");
      return;
    }
    if (formType === "DATE_RANGE" && (!rangeForm.rangeStart || !rangeForm.rangeEnd)) {
      setError("Укажите начало и конец периода");
      return;
    }

    setLoading(true);
    const body =
      formType === "WEEKLY"
        ? { type: "WEEKLY", daysOfWeek: weeklyForm.daysOfWeek, note: weeklyForm.note || null }
        : { type: "DATE_RANGE", daysOfWeek: [], rangeStart: rangeForm.rangeStart, rangeEnd: rangeForm.rangeEnd, note: rangeForm.note || null };

    const res = await fetch(`/api/admin/tours/${tourId}/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);

    if (res.ok) {
      const created = await res.json();
      setSchedules((prev) => [...prev, created]);
      cancelForm();
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Ошибка сохранения");
    }
  }

  async function toggleActive(s: Schedule) {
    const res = await fetch(`/api/admin/schedules/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSchedules((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: updated.isActive } : x)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить это расписание?")) return;
    const res = await fetch(`/api/admin/schedules/${id}`, { method: "DELETE" });
    if (res.ok) setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Расписание выездов</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Настройте правила для удобного создания выездов. Каждый выезд менеджер подтверждает вручную.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Добавить правило
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-4">Новое правило расписания</h4>

          {/* Type tabs */}
          <div className="flex gap-2 mb-4">
            {(["WEEKLY", "DATE_RANGE"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFormType(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  formType === t
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {t === "WEEKLY" ? "Еженедельно" : "Диапазон дат"}
              </button>
            ))}
          </div>

          {formType === "WEEKLY" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Дни недели</label>
                <div className="flex gap-2 flex-wrap">
                  {DAY_NAMES_FULL.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        weeklyForm.daysOfWeek.includes(idx)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                      }`}
                    >
                      {DAY_NAMES[idx]}
                    </button>
                  ))}
                </div>
                {weeklyForm.daysOfWeek.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    Выбрано: {[...weeklyForm.daysOfWeek].sort().map((d) => DAY_NAMES_FULL[d]).join(", ")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Примечание (необязательно)</label>
                <input
                  type="text"
                  placeholder="Напр: Летний сезон, выезды по выходным"
                  value={weeklyForm.note}
                  onChange={(e) => setWeeklyForm((f) => ({ ...f, note: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Начало периода</label>
                  <input
                    type="date"
                    value={rangeForm.rangeStart}
                    onChange={(e) => setRangeForm((f) => ({ ...f, rangeStart: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Конец периода</label>
                  <input
                    type="date"
                    value={rangeForm.rangeEnd}
                    onChange={(e) => setRangeForm((f) => ({ ...f, rangeEnd: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Примечание (необязательно)</label>
                <input
                  type="text"
                  placeholder="Напр: Праздничные выезды 1-10 мая"
                  value={rangeForm.note}
                  onChange={(e) => setRangeForm((f) => ({ ...f, note: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {loading ? "Сохраняем..." : "Сохранить"}
            </button>
            <button onClick={cancelForm} className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50">
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Schedules list */}
      {schedules.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          Нет правил расписания. Добавьте правило, чтобы быстро создавать выезды.
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                s.isActive ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200 opacity-60"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{formatSchedule(s)}</p>
                {s.note && <p className="text-xs text-gray-400 mt-0.5">{s.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {s.isActive ? "Активно" : "Выкл."}
                </span>
                <button
                  onClick={() => toggleActive(s)}
                  className="text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50"
                >
                  {s.isActive ? "Выключить" : "Включить"}
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
