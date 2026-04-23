"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CountryAutocomplete from "@/components/CountryAutocomplete";

type Tour = {
  id: string;
  title: string;
  basePrice: number;
  departures: {
    id: string;
    departureDate: string;
  }[];
};

type Manager = {
  id: string;
  name: string;
};

export default function NewApplicationForm({
  tours,
  managers,
  currentUserId,
}: {
  tours: Tour[];
  managers: Manager[];
  currentUserId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prefilledName = searchParams.get("name") ?? "";
  const prefilledWhatsapp = searchParams.get("whatsapp") ?? "";
  const prefilledCountry = searchParams.get("country") ?? "";
  const isFromClient = !!prefilledWhatsapp;

  const [clientName, setClientName] = useState(prefilledName);
  const [clientWhatsapp, setClientWhatsapp] = useState(prefilledWhatsapp);
  const [clientCountry, setClientCountry] = useState(prefilledCountry);

  const [tourId, setTourId] = useState("");
  const [departureId, setDepartureId] = useState("");
  const [persons, setPersons] = useState(1);
  const [comment, setComment] = useState("");
  const [managerId, setManagerId] = useState(currentUserId);
  const [source, setSource] = useState("instagram");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedTour = tours.find((t) => t.id === tourId);
  const estimatedPrice = selectedTour ? selectedTour.basePrice * persons : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/admin/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName,
        clientWhatsapp,
        clientCountry: clientCountry || null,
        tourId,
        departureId: departureId || null,
        persons,
        comment: comment || null,
        managerId: managerId || null,
        source,
      }),
    });

    setSubmitting(false);

    if (res.ok) {
      const data = await res.json();
      router.push(`/admin/applications/${data.id}`);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Ошибка создания заявки");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      {/* Client info */}
      <div className={`bg-white rounded-xl border p-5 ${isFromClient ? "border-blue-200 bg-blue-50/30" : "border-gray-200"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">Клиент</h2>
          {isFromClient && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
              Из профиля клиента
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              ФИО <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              disabled={isFromClient}
              placeholder="Иванов Иван"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isFromClient ? "border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed" : "border-gray-200"}`}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={clientWhatsapp}
              onChange={(e) => setClientWhatsapp(e.target.value)}
              disabled={isFromClient}
              placeholder="+996 700 000000"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isFromClient ? "border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed" : "border-gray-200"}`}
            />
            {!isFromClient && (
              <p className="text-xs text-gray-400 mt-1">
                Если клиент уже есть в базе по этому номеру — заявка привяжется к нему
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Страна
            </label>
            <CountryAutocomplete
              value={clientCountry}
              onChange={setClientCountry}
              disabled={isFromClient}
              placeholder="Кыргызстан"
              inputClassName={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isFromClient ? "border-gray-200 bg-gray-100 text-gray-600 cursor-not-allowed" : "border-gray-200"}`}
            />
          </div>
        </div>
      </div>

      {/* Tour */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Тур</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Тур <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={tourId}
              onChange={(e) => {
                setTourId(e.target.value);
                setDepartureId("");
              }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Выберите тур —</option>
              {tours.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} — {t.basePrice.toLocaleString()} сом/чел
                </option>
              ))}
            </select>
          </div>

          {selectedTour && selectedTour.departures.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Дата выезда
              </label>
              <select
                value={departureId}
                onChange={(e) => setDepartureId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Уточним позже —</option>
                {selectedTour.departures.map((d) => (
                  <option key={d.id} value={d.id}>
                    {new Date(d.departureDate).toLocaleDateString("ru", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Количество человек <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              max={100}
              value={persons}
              onChange={(e) => setPersons(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              onWheel={(e) => e.currentTarget.blur()}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {estimatedPrice > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              Ориентировочная сумма:{" "}
              <span className="font-bold">
                {estimatedPrice.toLocaleString()} сом
              </span>{" "}
              ({selectedTour?.basePrice.toLocaleString()} &times; {persons} чел.)
            </div>
          )}
        </div>
      </div>

      {/* Assignment */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          Назначение и источник
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Менеджер
            </label>
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Не назначен —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Источник
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="instagram">Instagram</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="facebook">Facebook</option>
              <option value="referral">Реферал</option>
              <option value="website">Сайт</option>
              <option value="crm">CRM (ручной ввод)</option>
              <option value="other">Другое</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Комментарий
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Пожелания, особенности, откуда узнал..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Создаю..." : "Создать заявку"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
