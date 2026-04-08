"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ItineraryBuilder from "./ItineraryBuilder";
import ListEditor from "./ListEditor";
import { CldUploadWidget } from "next-cloudinary";

interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

interface TourFormData {
  title: string;
  slug: string;
  description: string;
  tourType: string;
  duration: string;
  basePrice: string;
  minGroupSize: string;
  maxGroupSize: string;
  mapEmbed: string;
  seoTitle: string;
  seoDescription: string;
  isActive: boolean;
  itinerary: ItineraryDay[];
  included: string[];
  notIncluded: string[];
  images: string[];
}

interface Props {
  tourId?: string;
  initialData?: Partial<TourFormData>;
}

function generateSlug(title: string) {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
    ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
    н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
    ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return title
    .toLowerCase()
    .replace(/[а-яёА-ЯЁ]/g, (c) => map[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const TOUR_TYPES = [
  { value: "trekking", label: "Треккинг" },
  { value: "relax", label: "Отдых" },
  { value: "cultural", label: "Культурный" },
  { value: "adventure", label: "Приключения" },
  { value: "day_trip", label: "Однодневный" },
  { value: "ski", label: "Горнолыжный" },
];

const TABS = [
  { id: "main", label: "Основное" },
  { id: "photos", label: "Фото" },
  { id: "itinerary", label: "Программа" },
  { id: "included", label: "Включено/нет" },
  { id: "seo", label: "SEO" },
];

export default function TourForm({ tourId, initialData }: Props) {
  const router = useRouter();
  const isEdit = !!tourId;
  const [activeTab, setActiveTab] = useState("main");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const [form, setForm] = useState<TourFormData>({
    title: "",
    slug: "",
    description: "",
    tourType: "",
    duration: "",
    basePrice: "",
    minGroupSize: "1",
    maxGroupSize: "20",
    mapEmbed: "",
    seoTitle: "",
    seoDescription: "",
    isActive: true,
    itinerary: [],
    included: [],
    notIncluded: [],
    images: [],
    ...initialData,
  });

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugEdited && form.title) {
      setForm((f) => ({ ...f, slug: generateSlug(f.title) }));
    }
  }, [form.title, slugEdited]);

  function set(field: keyof TourFormData, value: unknown) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isEdit ? `/api/admin/tours/${tourId}` : "/api/admin/tours";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Ошибка сохранения");
      return;
    }

    const tour = await res.json();
    router.push(`/admin/tours/${tour.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Main ── */}
      {activeTab === "main" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название тура <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Трек к озеру Ала-Куль"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL (slug)
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  set("slug", e.target.value);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ala-kul-lake-trek"
              />
              <p className="text-xs text-gray-400 mt-1">
                Автогенерируется из названия. Используется в URL: /tours/
                <span className="font-mono">{form.slug || "..."}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип тура
              </label>
              <select
                value={form.tourType}
                onChange={(e) => set("tourType", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Выбрать —</option>
                {TOUR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Длительность (дней)
              </label>
              <input
                type="number"
                min="1"
                value={form.duration}
                onChange={(e) => set("duration", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="4"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Базовая цена (сом) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.basePrice}
                onChange={(e) => set("basePrice", e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="15000"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Мин. группа
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.minGroupSize}
                  onChange={(e) => set("minGroupSize", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Макс. группа
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.maxGroupSize}
                  onChange={(e) => set("maxGroupSize", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Подробное описание тура..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Карта маршрута (Google Maps embed URL)
            </label>
            <input
              type="text"
              value={form.mapEmbed}
              onChange={(e) => set("mapEmbed", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://www.google.com/maps/embed?..."
            />
          </div>

          {isEdit && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-gray-300 peer-checked:bg-blue-600 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-5"></div>
              </label>
              <span className="text-sm font-medium text-gray-700">
                {form.isActive ? "Тур активен (виден на сайте)" : "Тур неактивен (скрыт)"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Photos ── */}
      {activeTab === "photos" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Загрузите фотографии тура. Первое фото используется как обложка.
          </p>

          <CldUploadWidget
            uploadPreset="kapriz_tours"
            options={{ multiple: true, maxFiles: 20, resourceType: "image" }}
            onSuccess={(result) => {
              if (
                result.event === "success" &&
                typeof result.info === "object" &&
                result.info !== null &&
                "secure_url" in result.info
              ) {
                const url = (result.info as { secure_url: string }).secure_url;
                set("images", [...form.images, url]);
              }
            }}
          >
            {({ open }) => (
              <button
                type="button"
                onClick={() => open()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              >
                + Загрузить фото
              </button>
            )}
          </CldUploadWidget>

          {form.images.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
              Фото не добавлены
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {form.images.map((url, idx) => (
                <div key={url} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Фото ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute top-1.5 left-1.5 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                      Обложка
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {idx > 0 && (
                      <button
                        type="button"
                        title="Сделать обложкой"
                        onClick={() => {
                          const imgs = [...form.images];
                          imgs.splice(idx, 1);
                          set("images", [url, ...imgs]);
                        }}
                        className="bg-white text-gray-800 text-xs px-2 py-1 rounded hover:bg-gray-100"
                      >
                        ★
                      </button>
                    )}
                    <button
                      type="button"
                      title="Удалить"
                      onClick={() => set("images", form.images.filter((_, i) => i !== idx))}
                      className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Itinerary ── */}
      {activeTab === "itinerary" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Добавьте программу по дням. Порядок можно менять стрелками ↑↓.
          </p>
          <ItineraryBuilder
            value={form.itinerary}
            onChange={(v) => set("itinerary", v)}
          />
        </div>
      )}

      {/* ── Tab: Included ── */}
      {activeTab === "included" && (
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Включено в стоимость
            </h3>
            <ListEditor
              value={form.included}
              onChange={(v) => set("included", v)}
              placeholder="Трансфер Бишкек — ..."
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Не включено
            </h3>
            <ListEditor
              value={form.notIncluded}
              onChange={(v) => set("notIncluded", v)}
              placeholder="Личные расходы..."
            />
          </div>
        </div>
      )}

      {/* ── Tab: SEO ── */}
      {activeTab === "seo" && (
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SEO заголовок
            </label>
            <input
              type="text"
              value={form.seoTitle}
              onChange={(e) => set("seoTitle", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Трек к озеру Ала-Куль — 4 дня | KG Tours"
            />
            <p className="text-xs text-gray-400 mt-1">
              Рекомендуется до 60 символов.{" "}
              <span className={form.seoTitle.length > 60 ? "text-red-500" : ""}>
                {form.seoTitle.length}/60
              </span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SEO описание
            </label>
            <textarea
              value={form.seoDescription}
              onChange={(e) => set("seoDescription", e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Незабываемый трек через перевал Ала-Куль..."
            />
            <p className="text-xs text-gray-400 mt-1">
              Рекомендуется до 160 символов.{" "}
              <span className={form.seoDescription.length > 160 ? "text-red-500" : ""}>
                {form.seoDescription.length}/160
              </span>
            </p>
          </div>

          {/* Preview */}
          {(form.seoTitle || form.seoDescription) && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
                Превью в Google
              </p>
              <p className="text-blue-700 text-base font-medium">
                {form.seoTitle || form.title || "Заголовок тура"}
              </p>
              <p className="text-green-700 text-sm">
                yoursite.kg/tours/{form.slug}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                {form.seoDescription || "Описание тура..."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="flex gap-3 mt-6 pt-5 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? "Сохраняем..." : isEdit ? "Сохранить изменения" : "Создать тур"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/tours")}
          className="px-6 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
