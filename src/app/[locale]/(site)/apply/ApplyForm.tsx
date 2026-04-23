"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";
import CountryAutocomplete from "@/components/CountryAutocomplete";
import { normalizePhone } from "@/lib/phone";

interface Tour {
  id: string;
  title: string;
  slug: string;
  basePrice: number;
}

interface Departure {
  id: string;
  departureDate: string;
  status: string;
  note: string | null;
  applicationCount: number;
  maxSeats: number | null;
}

interface FormData {
  name: string;
  whatsapp: string;
  country: string;
  tourId: string;
  departureId: string;
  persons: string;
  comment: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
}

function ApplyFormInner({ tours }: { tours: Tour[] }) {
  const t = useTranslations("apply");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormData>({
    name: "",
    whatsapp: "",
    country: "",
    tourId: "",
    departureId: "",
    persons: "1",
    comment: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
  });

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [datesLoading, setDatesLoading] = useState(false);

  useEffect(() => {
    const tourSlug = searchParams.get("tour");
    const departureId = searchParams.get("departure") ?? "";
    const utmSource = searchParams.get("utm_source") ?? "";
    const utmMedium = searchParams.get("utm_medium") ?? "";
    const utmCampaign = searchParams.get("utm_campaign") ?? "";

    const matchedTour = tours.find((t) => t.slug === tourSlug);

    setForm((prev) => ({
      ...prev,
      tourId: matchedTour?.id ?? "",
      departureId,
      utmSource,
      utmMedium,
      utmCampaign,
    }));
  }, [searchParams, tours]);

  useEffect(() => {
    if (!form.tourId) {
      setDepartures([]);
      return;
    }
    setDatesLoading(true);
    setForm((prev) => ({ ...prev, departureId: prev.departureId }));
    fetch(`/api/site/tours/${form.tourId}/departures`)
      .then((r) => r.json())
      .then((data) => setDepartures(Array.isArray(data) ? data : []))
      .catch(() => setDepartures([]))
      .finally(() => setDatesLoading(false));
  }, [form.tourId]);

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleWhatsappChange(raw: string) {
    set("whatsapp", normalizePhone(raw));
  }

  function formatDeparture(dep: Departure): string {
    const date = new Date(dep.departureDate).toLocaleDateString(
      locale === "en" ? "en-US" : "ru-RU",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" }
    );
    const remaining =
      dep.maxSeats !== null ? dep.maxSeats - dep.applicationCount : null;
    let suffix = "";
    if (remaining !== null && remaining <= 5) {
      suffix =
        remaining <= 0
          ? ` · ${t("noSeats")}`
          : ` · ${t("seatsLeft", { n: remaining })}`;
    }
    return `${date}${suffix}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/site/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          whatsapp: form.whatsapp,
          country: form.country,
          tourId: form.tourId,
          departureId: form.departureId || null,
          persons: form.persons,
          comment: form.comment,
          utmSource: form.utmSource,
          utmMedium: form.utmMedium,
          utmCampaign: form.utmCampaign,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("errorGeneric"));
      } else {
        router.push("/apply/thanks");
      }
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  // text-[16px] prevents iOS Safari from auto-zooming on input focus
  const inputClass =
    "w-full px-4 py-3.5 border border-gray-200 rounded-xl font-body text-[16px] focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors duration-200 bg-white";
  const labelClass =
    "block font-heading font-700 text-gray-700 text-xs uppercase tracking-wider mb-2";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-sm p-8 space-y-6"
    >
      {/* Name */}
      <div>
        <label htmlFor="name" className={labelClass}>
          {t("nameLbl")} <span className="text-red-500">*</span>
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
          {t("whatsappLbl")} <span className="text-red-500">*</span>
        </label>
        <input
          id="whatsapp"
          type="tel"
          required
          value={form.whatsapp}
          onChange={(e) => handleWhatsappChange(e.target.value)}
          placeholder="+996 700 000 000"
          className={inputClass}
        />
        <p className="text-gray-400 text-xs mt-1.5">{t("whatsappHint")}</p>
      </div>

      {/* Country */}
      <div>
        <label htmlFor="country" className={labelClass}>
          {t("countryLbl")} <span className="text-red-500">*</span>
        </label>
        <CountryAutocomplete
          id="country"
          required
          value={form.country}
          onChange={(val) => set("country", val)}
          placeholder={locale === "en" ? "Kyrgyzstan" : "Кыргызстан"}
          inputClassName={inputClass}
        />
      </div>

      {/* Tour */}
      <div>
        <label htmlFor="tourId" className={labelClass}>
          {t("tourLbl")} <span className="text-red-500">*</span>
        </label>
        <select
          id="tourId"
          required
          value={form.tourId}
          onChange={(e) => set("tourId", e.target.value)}
          className={`${inputClass} cursor-pointer`}
        >
          <option value="">{t("tourPlaceholder")}</option>
          {tours.map((tour) => (
            <option key={tour.id} value={tour.id}>
              {tour.title} —{" "}
              {t("tourPrice", {
                price: tour.basePrice.toLocaleString(
                  locale === "en" ? "en-US" : "ru"
                ),
              })}
            </option>
          ))}
        </select>
      </div>

      {/* Departure date */}
      {form.tourId && (
        <div>
          <label htmlFor="departureId" className={labelClass}>
            {t("departureLbl")}
          </label>
          {datesLoading ? (
            <div className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-400 bg-gray-50">
              {t("datesLoading")}
            </div>
          ) : departures.length === 0 ? (
            <div className="w-full px-4 py-3.5 border border-yellow-200 rounded-xl text-sm text-yellow-700 bg-yellow-50">
              {t("noDatesWarning")}
            </div>
          ) : (
            <select
              id="departureId"
              value={form.departureId}
              onChange={(e) => set("departureId", e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">{t("departureAsk")}</option>
              {departures.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {formatDeparture(dep)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Persons */}
      <div>
        <label htmlFor="persons" className={labelClass}>
          {t("personsLbl")}
        </label>
        <select
          id="persons"
          value={form.persons}
          onChange={(e) => set("persons", e.target.value)}
          className={`${inputClass} cursor-pointer`}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <option key={n} value={n}>
              {n}{" "}
              {n === 1
                ? t("person_1")
                : n <= 4
                ? t("person_2_4")
                : t("person_5plus")}
            </option>
          ))}
        </select>
      </div>

      {/* Comment */}
      <div>
        <label htmlFor="comment" className={labelClass}>
          {t("commentLbl")}
        </label>
        <textarea
          id="comment"
          rows={3}
          value={form.comment}
          onChange={(e) => set("comment", e.target.value)}
          placeholder={t("commentPlaceholder")}
          className={`${inputClass} resize-none`}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 font-body">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-blue text-white font-heading font-800 uppercase tracking-wider text-sm py-4 rounded-xl hover:bg-brand-blue-dark transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {t("submitting")}
          </>
        ) : (
          t("submitBtn")
        )}
      </button>

      <p className="text-gray-400 text-xs text-center">{t("consent")}</p>
    </form>
  );
}

export default function ApplyForm({ tours }: { tours: Tour[] }) {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-2xl shadow-sm p-8 animate-pulse h-96" />
      }
    >
      <ApplyFormInner tours={tours} />
    </Suspense>
  );
}
