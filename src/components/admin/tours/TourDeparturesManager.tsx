"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Departure {
  id: string;
  departureDate: string;
  status: "OPEN" | "CLOSED" | "CANCELLED";
  note: string | null;
  _count: { applications: number };
  groups: {
    id: string;
    name: string;
    maxSeats: number;
    applications: { persons: number }[];
  }[];
  applications?: { persons: number }[];
}

interface Props {
  tourId: string;
  initialDepartures: Departure[];
}

const STATUS_LABELS = {
  OPEN: { label: "Активен", cls: "bg-green-100 text-green-700" },
  CLOSED: { label: "Деактивирован", cls: "bg-gray-100 text-gray-500" },
  CANCELLED: { label: "Отменён", cls: "bg-red-100 text-red-600" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TourDeparturesManager({ tourId, initialDepartures }: Props) {
  const [departures, setDepartures] = useState<Departure[]>(initialDepartures);

  // Sync with fresh server data after router.refresh() (e.g. when schedule rule generates new departures)
  useEffect(() => {
    setDepartures(initialDepartures);
  }, [initialDepartures]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ departureDate: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  async function handleCreate() {
    if (!form.departureDate) { setError("Укажите дату выезда"); return; }
    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/tours/${tourId}/departures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departureDate: form.departureDate, note: form.note || null }),
    });
    setLoading(false);

    if (res.ok) {
      const created = await res.json();
      setDepartures((prev) => [...prev, created].sort(
        (a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime()
      ));
      setForm({ departureDate: "", note: "" });
      setShowForm(false);
    } else {
      const data = await res.json();
      setError(data.error || "Ошибка создания");
    }
  }

  async function changeStatus(id: string, status: string) {
    const res = await fetch(`/api/admin/departures/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setDepartures((prev) => prev.map((d) => (d.id === id ? { ...d, status: status as Departure["status"] } : d)));
    }
  }

  async function handleDelete(id: string, appCount: number) {
    if (appCount > 0) {
      alert(`Нельзя удалить выезд: есть ${appCount} заявок. Сначала отмените или перенесите заявки.`);
      return;
    }
    if (!confirm("Удалить этот выезд?")) return;
    const res = await fetch(`/api/admin/departures/${id}`, { method: "DELETE" });
    if (res.ok) setDepartures((prev) => prev.filter((d) => d.id !== id));
  }

  // Group summary
  function groupSummary(dep: Departure) {
    if (dep.groups.length === 0) return null;
    const totalSeats = dep.groups.reduce((s, g) => s + g.maxSeats, 0);
    const totalFilled = dep.groups.reduce(
      (s, g) => s + g.applications.reduce((ps, a) => ps + a.persons, 0), 0
    );
    return { totalSeats, totalFilled, groupCount: dep.groups.length };
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-800">Выезды</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Каждый выезд — отдельная дата. Туристы записываются на конкретный выезд.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Создать выезд
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-4">Новый выезд</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Дата выезда *</label>
              <input
                type="date"
                value={form.departureDate}
                onChange={(e) => setForm((f) => ({ ...f, departureDate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Примечание</label>
              <input
                type="text"
                placeholder="Напр: Выезд в 3:30 от Вечного огня"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              {loading ? "Создаём..." : "Создать выезд"}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(""); }}
              className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Departures list */}
      {departures.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
          Нет выездов. Создайте первый выезд.
        </div>
      ) : (
        <div className="space-y-3">
          {departures.map((dep) => {
            const summary = groupSummary(dep);
            const statusMeta = STATUS_LABELS[dep.status];

            return (
              <div key={dep.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatDate(dep.departureDate)}
                      </p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusMeta.cls}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    {dep.note && (
                      <p className="text-xs text-gray-400 mt-0.5">{dep.note}</p>
                    )}

                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {(() => {
                        const unassignedPersons = dep.applications?.reduce((s, a) => s + a.persons, 0) ?? 0;
                        const totalGroupPersons = dep.groups.reduce(
                          (s, g) => s + g.applications.reduce((ps, a) => ps + a.persons, 0), 0
                        );
                        const total = unassignedPersons + totalGroupPersons;
                        return total > 0 ? (
                          <span className="text-xs text-gray-500">{total} чел.</span>
                        ) : null;
                      })()}

                      {dep.groups.length > 0 ? (
                        <span className="text-xs text-blue-600 font-medium">
                          {dep.groups.length} авт. ·{" "}
                          {dep.groups.map((g) => {
                            const gPersons = g.applications.reduce((s, a) => s + a.persons, 0);
                            return `${g.name}: ${gPersons}/${g.maxSeats}`;
                          }).join(", ")}
                        </span>
                      ) : (() => {
                        const unassignedPersons = dep.applications?.reduce((s, a) => s + a.persons, 0) ?? dep._count.applications;
                        return unassignedPersons > 0 ? (
                          <span className="text-xs text-yellow-600 font-medium">
                            Нераспределённые: {unassignedPersons} чел.
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {summary && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[200px]">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, (summary.totalFilled / summary.totalSeats) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">
                            {summary.totalFilled}/{summary.totalSeats} мест
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      href={`/admin/departures/${dep.id}`}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      Открыть
                    </Link>

                    {/* Toggle switch: Активен / Неактивен */}
                    {dep.status !== "CANCELLED" && (
                      <button
                        onClick={() => changeStatus(dep.id, dep.status === "OPEN" ? "CLOSED" : "OPEN")}
                        title={dep.status === "OPEN" ? "Деактивировать" : "Активировать"}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                          dep.status === "OPEN" ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                            dep.status === "OPEN" ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(dep.id, dep._count.applications)}
                      className="text-sm text-gray-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50"
                      title="Удалить выезд"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
