"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Tour {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
}

interface TourDate {
  id: string;
  startDate: string;
  endDate: string;
  maxSeats: number;
  _count: { applications: number };
}

interface FormData {
  name: string;
  whatsapp: string;
  country: string;
  tourId: string;
  tourDateId: string;
  persons: string;
  comment: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" };
  return `${s.toLocaleDateString("ru-RU", opts)} — ${e.toLocaleDateString("ru-RU", { ...opts, year: "numeric" })}`;
}

function ApplyFormInner({ tours }: { tours: Tour[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormData>({
    name: "",
    whatsapp: "",
    country: "",
    tourId: "",
    tourDateId: "",
    persons: "1",
    comment: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
  });

  const [tourDates, setTourDates] = useState<TourDate[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);

  // Pre-fill tour from URL param and capture UTMs
  useEffect(() => {
    const tourSlug = searchParams.get("tour");
    const utmSource = searchParams.get("utm_source") ?? "";
    const utmMedium = searchParams.get("utm_medium") ?? "";
    const utmCampaign = searchParams.get("utm_campaign") ?? "";

    const matchedTour = tours.find((t) => t.slug === tourSlug);

    setForm((prev) => ({
      ...prev,
      tourId: matchedTour?.id ?? "",
      tourDateId: "",
      utmSource,
      utmMedium,
      utmCampaign,
    }));
  }, [searchParams, tours]);

  // Load available dates when tour changes
  useEffect(() => {
    if (!form.tourId) {
      setTourDates([]);
      return;
    }
    setDatesLoading(true);
    setForm((prev) => ({ ...prev, tourDateId: "" }));
    fetch(`/api/site/tours/${form.tourId}/dates`)
      .then((r) => r.json())
      .then((data) => setTourDates(Array.isArray(data) ? data : []))
      .catch(() => setTourDates([]))
      .finally(() => setDatesLoading(false));
  }, [form.tourId]);

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.tourDateId && tourDates.length > 0) {
      setError("Пожалуйста, выберите дату тура.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/site/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Произошла ошибка. Попробуйте ещё раз.");
      } else {
        router.push("/apply/thanks");
      }
    } catch {
      setError("Ошибка сети. Проверьте подключение.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full px-4 py-3.5 border border-gray-200 rounded-xl font-body text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors duration-200 bg-white";
  const labelClass =
    "block font-heading font-700 text-gray-700 text-xs uppercase tracking-wider mb-2";

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
      {/* Name */}
      <div>
        <label htmlFor="name" className={labelClass}>
          Имя и фамилия <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Айбек Мамытбеков"
          className={inputClass}
        />
      </div>

      {/* WhatsApp */}
      <div>
        <label htmlFor="whatsapp" className={labelClass}>
          Номер WhatsApp <span className="text-red-500">*</span>
        </label>
        <input
          id="whatsapp"
          type="tel"
          required
          value={form.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value)}
          placeholder="+996 700 000 000"
          className={inputClass}
        />
        <p className="text-gray-400 text-xs mt-1.5">
          На этот номер мы напишем в WhatsApp
        </p>
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className={labelClass}>
          Страна / город <span className="text-red-500">*</span>
        </label>
        <input
          id="country"
          type="text"
          required
          value={form.country}
          onChange={(e) => set("country", e.target.value)}
          placeholder="Кыргызстан, Бишкек"
          className={inputClass}
        />
      </div>

      {/* Tour */}
      <div>
        <label htmlFor="tourId" className={labelClass}>
          Тур <span className="text-red-500">*</span>
        </label>
        <select
          id="tourId"
          required
          value={form.tourId}
          onChange={(e) => set("tourId", e.target.value)}
          className={`${inputClass} cursor-pointer`}
        >
          <option value="">— Выберите тур —</option>
          {tours.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} — {t.basePrice.toLocaleString("ru")} сом
            </option>
          ))}
        </select>
      </div>

      {/* Tour date */}
      {form.tourId && (
        <div>
          <label htmlFor="tourDateId" className={labelClass}>
            Дата тура <span className="text-red-500">*</span>
          </label>
          {datesLoading ? (
            <div className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-400 bg-gray-50">
              Загружаем даты...
            </div>
          ) : tourDates.length === 0 ? (
            <div className="w-full px-4 py-3.5 border border-yellow-200 rounded-xl text-sm text-yellow-700 bg-yellow-50">
              Нет доступных дат. Свяжитесь с нами напрямую.
            </div>
          ) : (
            <select
              id="tourDateId"
              required
              value={form.tourDateId}
              onChange={(e) => set("tourDateId", e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">— Выберите дату —</option>
              {tourDates.map((d) => {
                const free = d.maxSeats - d._count.applications;
                return (
                  <option key={d.id} value={d.id}>
                    {formatDateRange(d.startDate, d.endDate)}
                    {free <= 5 ? ` · осталось ${free} мест` : ""}
                  </option>
                );
              })}
            </select>
          )}
        </div>
      )}

      {/* Persons */}
      <div>
        <label htmlFor="persons" className={labelClass}>
          Кол-во человек
        </label>
        <select
          id="persons"
          value={form.persons}
          onChange={(e) => set("persons", e.target.value)}
          className={`${inputClass} cursor-pointer`}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "человек" : n <= 4 ? "человека" : "человек"}
            </option>
          ))}
        </select>
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="comment" className={labelClass}>
          Комментарий / пожелания
        </label>
        <textarea
          id="comment"
          rows={3}
          value={form.comment}
          onChange={(e) => set("comment", e.target.value)}
          placeholder="Особые пожелания, вопросы..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-body">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-blue text-white font-heading font-800 uppercase tracking-wider text-sm py-4 rounded-xl hover:bg-brand-blue-dark transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Отправляем...
          </>
        ) : (
          "Отправить заявку"
        )}
      </button>

      <p className="text-gray-400 text-xs text-center">
        Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
      </p>
    </form>
  );
}

export default function ApplyForm({ tours }: { tours: Tour[] }) {
  return (
    <Suspense fallback={<div className="bg-white rounded-2xl shadow-sm p-8 animate-pulse h-96" />}>
      <ApplyFormInner tours={tours} />
    </Suspense>
  );
}
