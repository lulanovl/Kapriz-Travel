"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUSES = [
  { id: "NEW",      label: "Новая",         color: "bg-blue-100 text-blue-700"   },
  { id: "CONTACT",  label: "Контакт",       color: "bg-yellow-100 text-yellow-700" },
  { id: "DEPOSIT",  label: "Предоплата",    color: "bg-orange-100 text-orange-700" },
  { id: "IN_BUS",   label: "Распределение", color: "bg-indigo-100 text-indigo-700" },
  { id: "NO_SHOW",  label: "Не явился",     color: "bg-red-100 text-red-700"     },
  { id: "ON_TOUR",  label: "В туре",        color: "bg-green-100 text-green-700"  },
  { id: "FEEDBACK", label: "Отзыв",         color: "bg-teal-100 text-teal-700"   },
  { id: "ARCHIVE",  label: "Архив",         color: "bg-gray-100 text-gray-500"   },
];

const PAYMENT_STATUSES = [
  { id: "PENDING", label: "Без оплаты" },
  { id: "PARTIAL", label: "Частично" },
  { id: "PAID", label: "Оплачено" },
];

const CURRENCIES = ["KGS", "USD", "EUR"];

type PriceHistoryItem = {
  id: string;
  changedBy: string;
  oldPrice: number;
  newPrice: number;
  reason: string | null;
  changedAt: string;
};

type Reminder = {
  id: string;
  note: string | null;
  dueAt: string;
  isDone: boolean;
  user: { id: string; name: string };
};

type Companion = {
  id: string;
  name: string;
  whatsapp: string | null;
};

type ApplicationData = {
  id: string;
  status: string;
  persons: number;
  comment: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  isWaitlist: boolean;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    whatsapp: string;
    country: string | null;
    city: string | null;
    tag: string | null;
    notes: string | null;
  };
  tour: { id: string; title: string; basePrice: number; slug: string };
  departure: {
    id: string;
    departureDate: string;
  } | null;
  group: {
    id: string;
    name: string;
  } | null;
  manager: { id: string; name: string; email: string } | null;
  booking: {
    id: string;
    basePrice: number;
    finalPrice: number;
    priceChangeReason: string | null;
    depositPaid: number;
    depositDate: string | null;
    paymentStatus: string;
    currency: string;
    noShow: boolean;
    priceHistory: PriceHistoryItem[];
  } | null;
  reminders: Reminder[];
  companions: Companion[];
  managers: { id: string; name: string }[];
  tourDepartures: { id: string; departureDate: string }[];
  currentUserId: string;
  currentUserRole: string;
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function ApplicationDetailClient({
  data,
}: {
  data: ApplicationData;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(data.status);
  const [managerId, setManagerId] = useState(data.manager?.id ?? "");
  const [comment, setComment] = useState(data.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const defaultFinalPrice = data.booking?.finalPrice ?? data.tour.basePrice * data.persons;
  const [finalPrice, setFinalPrice] = useState(defaultFinalPrice);
  const [priceReason, setPriceReason] = useState(data.booking?.priceChangeReason ?? "");
  const [depositPaid, setDepositPaid] = useState(data.booking?.depositPaid ?? 0);
  const [depositDate, setDepositDate] = useState(
    data.booking?.depositDate
      ? new Date(data.booking.depositDate).toISOString().slice(0, 10)
      : ""
  );
  const [paymentStatus, setPaymentStatus] = useState(data.booking?.paymentStatus ?? "PENDING");

  const handleDepositChange = (value: number) => {
    setDepositPaid(value);
    if (value > 0 && !depositDate) {
      setDepositDate(new Date().toISOString().slice(0, 10));
    }
    if (value >= finalPrice && value > 0) {
      setPaymentStatus("PAID");
    } else if (value > 0) {
      setPaymentStatus("PARTIAL");
    } else {
      setPaymentStatus("PENDING");
    }
  };
  const [currency, setCurrency] = useState(data.booking?.currency ?? "KGS");

  const [departureId, setDepartureId] = useState(data.departure?.id ?? "");

  // Companions
  const [companions, setCompanions] = useState<Companion[]>(data.companions);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addingCompanion, setAddingCompanion] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [companionMsg, setCompanionMsg] = useState<string | null>(null);

  const currentStatus = STATUSES.find((s) => s.id === status);
  const phone = data.client.whatsapp.replace(/\D/g, "");
  const balance = paymentStatus === "PAID" ? 0 : Math.max(0, finalPrice - depositPaid);
  const calculatedPrice = data.tour.basePrice * data.persons;
  const priceMatchesCalc = Math.abs(finalPrice - calculatedPrice) < 1;

  const handleAddCompanion = async () => {
    if (!newName.trim()) return;
    setAddingCompanion(true);
    const res = await fetch(`/api/admin/applications/${data.id}/companions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), whatsapp: newPhone.trim() || null }),
    });
    setAddingCompanion(false);
    if (res.ok) {
      const created = await res.json();
      setCompanions((prev) => [...prev, created]);
      setNewName("");
      setNewPhone("");
      setShowAddForm(false);
      if (created.clientCreated) {
        setCompanionMsg(`Клиент ${created.name} добавлен в базу клиентов`);
        setTimeout(() => setCompanionMsg(null), 4000);
      }
    }
  };

  const handleDeleteCompanion = async (id: string) => {
    const res = await fetch(`/api/admin/companions/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCompanions((prev) => prev.filter((c) => c.id !== id));
    }
  };

  // 24h rule: deposit is refunded if departure is more than 24h away (or not set)
  const willRefund = (() => {
    if (!data.departure?.departureDate) return true;
    const hoursUntil = (new Date(data.departure.departureDate).getTime() - Date.now()) / 3_600_000;
    return hoursUntil > 24;
  })();

  const handleCancelConfirm = async () => {
    setCancelLoading(true);
    const res = await fetch(`/api/admin/applications/${data.id}/cancel`, { method: "POST" });
    setCancelLoading(false);
    if (res.ok) {
      setShowCancelModal(false);
      router.push("/admin/applications");
    }
  };

  const handleConfirm = async () => {
    const newManagerId = managerId || data.currentUserId;
    setManagerId(newManagerId);
    setActionLoading(true);
    const res = await fetch(`/api/admin/applications/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CONTACT", managerId: newManagerId }),
    });
    setActionLoading(false);
    if (res.ok) {
      setStatus("CONTACT");
      router.refresh();
    }
  };

  const handleReject = () => {
    setShowCancelModal(true);
  };

  const handleReceiveFullPayment = async () => {
    if (!confirm("Принять полную оплату? Остаток будет отмечен как оплачен.")) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch(`/api/admin/applications/${data.id}/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalPrice,
          depositPaid: finalPrice,
          depositDate: depositDate || new Date().toISOString().slice(0, 10),
          paymentStatus: "PAID",
          currency,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveError(d.error ?? "Ошибка сохранения");
        return;
      }
      setDepositPaid(finalPrice);
      setPaymentStatus("PAID");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    setSaving(true);
    setSaveError("");
    try {
      // Prevent race condition: if deposit is entered and status can auto-advance, set it explicitly
      const AUTO_DEPOSIT_STATUSES = ["NEW", "CONTACT", "PROPOSAL"];
      const effectiveStatus =
        depositPaid > 0 && AUTO_DEPOSIT_STATUSES.includes(status) ? "DEPOSIT" : status;

      const [appRes, bookingRes] = await Promise.all([
        fetch(`/api/admin/applications/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: effectiveStatus,
            managerId: managerId || null,
            comment,
            departureId: departureId || null,
          }),
        }),
        fetch(`/api/admin/applications/${data.id}/booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finalPrice,
            priceChangeReason: priceReason || null,
            depositPaid,
            depositDate: depositDate || null,
            paymentStatus,
            currency,
          }),
        }),
      ]);

      if (!appRes.ok) {
        const d = await appRes.json().catch(() => ({}));
        setSaveError(d.error ?? "Ошибка сохранения заявки");
        return;
      }
      if (!bookingRes.ok) {
        const d = await bookingRes.json().catch(() => ({}));
        setSaveError(d.error ?? "Ошибка сохранения финансов");
        return;
      }

      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* LEFT column */}
      <div className="xl:col-span-2 space-y-5">

        {/* Action buttons for NEW applications */}
        {status === "NEW" && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-900">Новая заявка</p>
              <p className="text-xs text-blue-600 mt-0.5">
                Подтвердите заявку чтобы начать работу с клиентом, или отклоните если тур не подходит
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleConfirm}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "..." : "Подтвердить"}
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                Отклонить
              </button>
            </div>
          </div>
        )}

        {/* NO_SHOW info */}
        {status === "NO_SHOW" && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <p className="text-sm font-semibold text-red-900">Клиент не явился</p>
            <p className="text-xs text-red-600 mt-1">
              Предоплата остаётся у компании. В финансовом отчёте учитывается только сумма предоплаты,
              не полная стоимость тура.
            </p>
          </div>
        )}

        {/* Status & Assignment */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Статус и менеджер
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
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
                {data.managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentStatus && (
            <div className="mt-3">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${currentStatus.color}`}
              >
                {currentStatus.label}
              </span>
              {data.isWaitlist && (
                <span className="ml-2 inline-block px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Лист ожидания
                </span>
              )}
            </div>
          )}
        </div>

        {/* Comment */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            Комментарий / заметки
          </h2>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="Заметки по заявке..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">
              Создана:{" "}
              {new Date(data.createdAt).toLocaleDateString("ru", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {status !== "NEW" && (
              <button
                onClick={handleReject}
                disabled={actionLoading || status === "ARCHIVE"}
                className="px-3 py-2 bg-white text-red-500 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                Клиент отказался
              </button>
            )}
          </div>
        </div>

        {/* Financials */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            Финансы
          </h2>

          {/* Price hint */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            Расчёт:{" "}
            <span className="font-semibold">
              {data.tour.basePrice.toLocaleString()} сом
            </span>{" "}
            &times; {data.persons} чел. ={" "}
            <span className="font-bold">
              {calculatedPrice.toLocaleString()} сом
            </span>
            {!priceMatchesCalc && (
              <button
                onClick={() => setFinalPrice(calculatedPrice)}
                className="ml-2 underline hover:no-underline"
              >
                Сбросить
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Базовая цена за чел.
              </label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500 border border-gray-100">
                {data.tour.basePrice.toLocaleString()}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Итоговая цена (все)
              </label>
              <input
                type="number"
                value={finalPrice || ""}
                onChange={(e) => setFinalPrice(e.target.value === "" ? 0 : Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Причина изменения цены
              </label>
              <input
                type="text"
                value={priceReason}
                onChange={(e) => setPriceReason(e.target.value)}
                placeholder="Скидка, акция, промокод..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Предоплата
              </label>
              <input
                type="number"
                value={depositPaid || ""}
                onChange={(e) => handleDepositChange(e.target.value === "" ? 0 : Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Дата предоплаты
              </label>
              <input
                type="date"
                value={depositDate}
                onChange={(e) => setDepositDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Статус оплаты
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Валюта
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Balance summary */}
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">Остаток к оплате:</span>
            <span
              className={`text-lg font-bold ${
                balance > 0 ? "text-orange-600" : "text-green-600"
              }`}
            >
              {balance > 0 ? balance.toLocaleString() : "0"} {currency}
            </span>
          </div>

          {/* Quick full-payment button (tourist paid manager directly) */}
          {balance > 0 && paymentStatus !== "PAID" && (
            <div className="mt-3 flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-800">Турист оплатил остаток менеджеру?</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Нажмите чтобы зафиксировать полную оплату — {balance.toLocaleString()} {currency}
                </p>
              </div>
              <button
                onClick={handleReceiveFullPayment}
                disabled={saving}
                className="shrink-0 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                {saving ? "..." : "Принять оплату"}
              </button>
            </div>
          )}

          {status === "NO_SHOW" && depositPaid > 0 && (
            <div className="bg-red-50 rounded-lg p-3 mt-3 flex items-center justify-between">
              <span className="text-sm text-red-700">Удержанная предоплата:</span>
              <span className="text-base font-bold text-red-700">
                {depositPaid.toLocaleString()} {currency}
              </span>
            </div>
          )}

          {/* Price history */}
          {data.booking && data.booking.priceHistory.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 mb-2">
                История цен
              </p>
              <div className="space-y-2">
                {data.booking.priceHistory.map((ph) => (
                  <div
                    key={ph.id}
                    className="flex items-center justify-between text-xs border-l-2 border-orange-300 pl-2"
                  >
                    <div>
                      <span className="text-gray-500 line-through mr-1">
                        {ph.oldPrice.toLocaleString()}
                      </span>
                      <span className="text-gray-900 font-medium">
                        {ph.newPrice.toLocaleString()}
                      </span>
                      {ph.reason && (
                        <span className="text-gray-400 ml-1">({ph.reason})</span>
                      )}
                    </div>
                    <div className="text-gray-400 text-right">
                      <div>{ph.changedBy}</div>
                      <div>
                        {new Date(ph.changedAt).toLocaleDateString("ru")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* UTM */}
        {(data.utmSource || data.utmMedium || data.utmCampaign) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">
              Источник трафика
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Источник", value: data.utmSource },
                { label: "Канал", value: data.utmMedium },
                { label: "Кампания", value: data.utmCampaign },
              ]
                .filter((i) => i.value)
                .map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800">
                      {item.value}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Unified save button */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3">
          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}
          {!saveError && <span />}
          <button
            onClick={handleSaveAndExit}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Сохраняю..." : "Сохранить и выйти"}
          </button>
        </div>
      </div>

      {/* RIGHT column */}
      <div className="space-y-5">
        {/* Client card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">Клиент</h2>
            <Link
              href={`/admin/clients/${data.client.id}`}
              className="text-xs text-blue-600 hover:underline"
            >
              Открыть профиль
            </Link>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-lg font-bold text-gray-900">
                {data.client.name}
              </p>
              {(data.client.country || data.client.city) && (
                <p className="text-sm text-gray-500">
                  {[data.client.city, data.client.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>

            <a
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg px-3 py-2 transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs text-green-700 font-medium">WhatsApp</p>
                <p className="text-sm text-green-900">{data.client.whatsapp}</p>
              </div>
            </a>

            {data.client.tag && (
              <div>
                <p className="text-xs text-gray-400">Тег</p>
                <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                  {data.client.tag}
                </span>
              </div>
            )}

            {data.client.notes && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Заметки о клиенте</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                  {data.client.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Companions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Попутчики</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {companions.length} из {data.persons} чел.
              </p>
            </div>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {showAddForm ? "Отмена" : "+ Добавить"}
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Имя и фамилия *"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="WhatsApp (необязательно)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddCompanion}
                disabled={addingCompanion || !newName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                {addingCompanion ? "Сохраняю..." : "Добавить попутчика"}
              </button>
            </div>
          )}

          {/* Auto-client notification */}
          {companionMsg && (
            <div className="mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              ✓ {companionMsg}
            </div>
          )}

          {/* List */}
          {companions.length === 0 ? (
            <p className="text-sm text-gray-400">Попутчики не добавлены</p>
          ) : (
            <div className="space-y-2">
              {companions.map((c) => {
                const cPhone = c.whatsapp?.replace(/\D/g, "") ?? "";
                return (
                  <div key={c.id} className="flex items-center gap-2 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      {c.whatsapp && (
                        <a
                          href={`https://wa.me/${cPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:underline"
                        >
                          {c.whatsapp}
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteCompanion(c.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                      title="Удалить"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tour info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Тур</h2>
          <div className="space-y-2">
            <Link
              href={`/admin/tours/${data.tour.id}`}
              className="text-blue-600 hover:underline font-medium text-sm"
            >
              {data.tour.title}
            </Link>
            <div className="grid grid-cols-2 gap-2 text-sm mt-2">
              <div>
                <p className="text-xs text-gray-400">Человек</p>
                <p className="font-medium">{data.persons}</p>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Дата выезда
              </label>
              <select
                value={departureId}
                onChange={(e) => setDepartureId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Не выбрана —</option>
                {data.tourDepartures.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {new Date(dep.departureDate).toLocaleDateString("ru", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </option>
                ))}
              </select>
              {data.group && (
                <p className="text-xs text-blue-500 mt-1">
                  Группа: {data.group.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Reminders */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">
            Напоминания
          </h2>
          {data.reminders.length === 0 ? (
            <p className="text-sm text-gray-400">Напоминаний нет</p>
          ) : (
            <div className="space-y-2">
              {data.reminders.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-start gap-2 p-2 rounded-lg border ${
                    r.isDone
                      ? "bg-gray-50 border-gray-100 opacity-60"
                      : new Date(r.dueAt) < new Date()
                      ? "bg-red-50 border-red-100"
                      : "bg-yellow-50 border-yellow-100"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{r.note}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(r.dueAt).toLocaleDateString("ru", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {r.user.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-red-600 px-6 py-4">
              <h3 className="text-base font-semibold text-white">Клиент отказывается от тура</h3>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Financial summary — always visible */}
              <div className="rounded-xl border border-gray-200 overflow-hidden text-sm">
                {data.departure && (
                  <div className="flex justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                    <span className="text-gray-500">Дата выезда</span>
                    <span className="font-medium text-gray-900">
                      {new Date(data.departure.departureDate).toLocaleDateString("ru-RU", {
                        weekday: "short", day: "numeric", month: "long", year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-gray-500">Итоговая цена</span>
                  <span className="font-semibold text-gray-900">{finalPrice.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 border-b border-gray-100">
                  <span className="text-gray-500">Предоплата получена</span>
                  <span className={`font-semibold ${depositPaid > 0 ? "text-gray-900" : "text-gray-400"}`}>
                    {depositPaid > 0 ? `${depositPaid.toLocaleString()} ${currency}` : "не зафиксирована"}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-500">Остаток к оплате</span>
                  <span className="font-semibold text-gray-900">
                    {Math.max(0, finalPrice - depositPaid).toLocaleString()} {currency}
                  </span>
                </div>
              </div>

              {/* Deposit decision banner */}
              {depositPaid > 0 ? (
                willRefund ? (
                  <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-green-800">Предоплата возвращается клиенту</p>
                      <p className="text-sm text-green-700 mt-0.5">
                        До выезда больше 24 часов —{" "}
                        <span className="font-bold">{depositPaid.toLocaleString()} {currency}</span>{" "}
                        будут возвращены. Из финансов компании они будут убраны.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                    <svg className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-orange-800">Предоплата остаётся у компании</p>
                      <p className="text-sm text-orange-700 mt-0.5">
                        До выезда менее 24 часов —{" "}
                        <span className="font-bold">{depositPaid.toLocaleString()} {currency}</span>{" "}
                        не возвращаются согласно правилам отмены.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
                  Предоплата не получена — финансовых возвратов не требуется.
                  {finalPrice > 0 && (
                    <span className="block mt-1 text-xs text-gray-400">
                      Если предоплата была получена — сначала сохраните её в бронировании.
                    </span>
                  )}
                </div>
              )}

              {data.group && (
                <p className="text-sm text-gray-500">
                  Турист будет убран из группы <span className="font-medium text-gray-800">{data.group.name}</span>.
                </p>
              )}

              <p className="text-sm text-gray-500">Заявка будет переведена в архив.</p>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {cancelLoading ? "Обрабатываю..." : "Подтвердить отказ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
