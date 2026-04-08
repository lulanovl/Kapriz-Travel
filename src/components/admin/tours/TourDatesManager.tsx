"use client";

import { useState } from "react";

interface TourDate {
  id: string;
  startDate: string;
  endDate: string;
  maxSeats: number;
  guide?: { id: string; name: string } | null;
  driver?: { id: string; name: string } | null;
  _count: { applications: number };
}

interface Props {
  tourId: string;
  initialDates: TourDate[];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toInputDate(dateStr: string) {
  return new Date(dateStr).toISOString().split("T")[0];
}

const emptyForm = {
  startDate: "",
  endDate: "",
  maxSeats: "10",
  guideId: "",
  driverId: "",
};

export default function TourDatesManager({ tourId, initialDates }: Props) {
  const [dates, setDates] = useState<TourDate[]>(initialDates);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  // Guide token state: dateId → { token, expiresAt, copied, generating }
  const [guideTokens, setGuideTokens] = useState<
    Record<string, { token: string; expiresAt: string; copied: boolean; generating: boolean }>
  >({});

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(date: TourDate) {
    setEditingId(date.id);
    setForm({
      startDate: toInputDate(date.startDate),
      endDate: toInputDate(date.endDate),
      maxSeats: String(date.maxSeats),
      guideId: date.guide?.id ?? "",
      driverId: date.driver?.id ?? "",
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.startDate || !form.endDate) return;
    setLoading(true);

    if (editingId) {
      const res = await fetch(`/api/admin/tour-dates/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const updated = await res.json();
        setDates((prev) => prev.map((d) => (d.id === editingId ? updated : d)));
        cancelForm();
      }
    } else {
      const res = await fetch(`/api/admin/tours/${tourId}/dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const created = await res.json();
        setDates((prev) => [...prev, created]);
        cancelForm();
      }
    }
    setLoading(false);
  }

  async function handleDelete(dateId: string) {
    if (!confirm("Удалить эту дату?")) return;
    const res = await fetch(`/api/admin/tour-dates/${dateId}`, { method: "DELETE" });
    if (res.ok) {
      setDates((prev) => prev.filter((d) => d.id !== dateId));
    }
  }

  async function generateGuideToken(dateId: string) {
    setGuideTokens((prev) => ({
      ...prev,
      [dateId]: { ...prev[dateId], token: prev[dateId]?.token ?? "", expiresAt: "", copied: false, generating: true },
    }));

    try {
      const res = await fetch(`/api/admin/tour-dates/${dateId}/guide-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 30 }),
      });
      if (res.ok) {
        const data = await res.json();
        setGuideTokens((prev) => ({
          ...prev,
          [dateId]: { token: data.token, expiresAt: data.expiresAt, copied: false, generating: false },
        }));
      }
    } catch {
      setGuideTokens((prev) => ({
        ...prev,
        [dateId]: { ...prev[dateId], generating: false },
      }));
    }
  }

  function copyGuideLink(dateId: string) {
    const tokenData = guideTokens[dateId];
    if (!tokenData?.token) return;
    const url = `${window.location.origin}/guide/${tokenData.token}`;
    navigator.clipboard.writeText(url);
    setGuideTokens((prev) => ({ ...prev, [dateId]: { ...tokenData, copied: true } }));
    setTimeout(() => {
      setGuideTokens((prev) => ({
        ...prev,
        [dateId]: { ...prev[dateId], copied: false },
      }));
    }, 2500);
  }

  function availabilityColor(date: TourDate) {
    const ratio = date._count.applications / date.maxSeats;
    if (ratio >= 1) return "text-red-600 bg-red-50";
    if (ratio >= 0.7) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  }

  function availabilityLabel(date: TourDate) {
    const free = date.maxSeats - date._count.applications;
    if (free <= 0) return "Мест нет";
    if (free <= 3) return `Осталось ${free}`;
    return `${free} мест`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-800">Даты отправлений</h3>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Добавить дату
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-4">
            {editingId ? "Редактировать дату" : "Новая дата"}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Дата начала
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Дата окончания
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => set("endDate", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Макс. мест
              </label>
              <input
                type="number"
                min="1"
                value={form.maxSeats}
                onChange={(e) => set("maxSeats", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={loading || !form.startDate || !form.endDate}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {loading ? "Сохраняем..." : "Сохранить"}
            </button>
            <button
              onClick={cancelForm}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Dates list */}
      {dates.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          Нет дат. Добавьте первую дату отправления.
        </div>
      ) : (
        <div className="space-y-3">
          {dates.map((date) => {
            const tokenData = guideTokens[date.id];
            return (
              <div key={date.id} className="bg-white border border-gray-200 rounded-xl px-5 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {formatDate(date.startDate)} — {formatDate(date.endDate)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {date._count.applications}/{date.maxSeats} участников
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${availabilityColor(date)}`}>
                      {availabilityLabel(date)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {/* Guide token button */}
                    {!tokenData?.token ? (
                      <button
                        onClick={() => generateGuideToken(date.id)}
                        disabled={tokenData?.generating}
                        className="text-sm text-purple-600 hover:text-purple-800 px-3 py-1 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 font-medium"
                        title="Сгенерировать ссылку для гида"
                      >
                        {tokenData?.generating ? "..." : "🔗 Гиду"}
                      </button>
                    ) : (
                      <button
                        onClick={() => copyGuideLink(date.id)}
                        className={`text-sm px-3 py-1 rounded-lg transition-colors font-medium ${
                          tokenData.copied
                            ? "text-green-700 bg-green-50"
                            : "text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                        }`}
                        title="Скопировать ссылку"
                      >
                        {tokenData.copied ? "✓ Скопировано" : "📋 Скопировать ссылку"}
                      </button>
                    )}
                    {tokenData?.token && (
                      <button
                        onClick={() => generateGuideToken(date.id)}
                        disabled={tokenData.generating}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
                        title="Обновить ссылку (старая перестанет работать)"
                      >
                        ↺
                      </button>
                    )}

                    <button
                      onClick={() => startEdit(date)}
                      className="text-sm text-gray-500 hover:text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(date.id)}
                      disabled={date._count.applications > 0}
                      title={date._count.applications > 0 ? "Нельзя удалить — есть участники" : ""}
                      className="text-sm text-gray-500 hover:text-red-600 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Удалить
                    </button>
                  </div>
                </div>

                {/* Guide link info */}
                {tokenData?.token && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-purple-600">Ссылка гиду</span>
                      {" · "}действует до{" "}
                      {new Date(tokenData.expiresAt).toLocaleDateString("ru", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                      {window?.location?.origin}/guide/{tokenData.token}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
