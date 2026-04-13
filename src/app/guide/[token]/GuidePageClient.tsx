"use client";

import { useState } from "react";

type GuidePaymentStatus = "PENDING" | "PAID" | "TRANSFERRED" | "NO_SHOW";

type Participant = {
  id: string;
  persons: number;
  client: { name: string; whatsapp: string; country: string | null };
  booking: {
    finalPrice: number;
    depositPaid: number;
    currency: string;
    paymentStatus: string;
    guidePaymentStatus: GuidePaymentStatus;
  } | null;
};

type Expense = {
  id: string;
  category: string;
  amount: number;
  currency: string;
  note: string | null;
};

interface Props {
  token: string;
  participants: Participant[];
  expenses: Expense[];
}

const STATUS_CONFIG: Record<GuidePaymentStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Ожидает", color: "text-gray-500", bg: "bg-gray-100" },
  PAID: { label: "Оплатил", color: "text-green-700", bg: "bg-green-100" },
  TRANSFERRED: { label: "Перевел менеджеру", color: "text-blue-700", bg: "bg-blue-100" },
  NO_SHOW: { label: "Не явился", color: "text-red-700", bg: "bg-red-100" },
};

export default function GuidePageClient({ token, participants: initial, expenses }: Props) {
  const [participants, setParticipants] = useState<Participant[]>(initial);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const expCurrency = expenses[0]?.currency ?? "KGS";

  // Budget calculations
  const toPay = participants.filter(
    (p) => p.booking && p.booking.guidePaymentStatus === "PENDING"
      && p.booking.finalPrice > p.booking.depositPaid
  );
  const collected = participants.filter((p) => p.booking?.guidePaymentStatus === "PAID");
  const transferred = participants.filter((p) => p.booking?.guidePaymentStatus === "TRANSFERRED");
  const noShows = participants.filter((p) => p.booking?.guidePaymentStatus === "NO_SHOW");

  const balance = (p: Participant) =>
    p.booking ? Math.max(0, p.booking.finalPrice - p.booking.depositPaid) : 0;

  const expectedBudget = [...toPay, ...collected].reduce((s, p) => s + balance(p), 0);
  const collectedAmount = collected.reduce((s, p) => s + balance(p), 0);
  const net = collectedAmount - totalExpenses;

  async function setStatus(appId: string, status: GuidePaymentStatus) {
    setLoading((prev) => ({ ...prev, [appId]: true }));
    try {
      const res = await fetch(`/api/guide/${token}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, status }),
      });
      if (res.ok) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === appId && p.booking
              ? { ...p, booking: { ...p.booking, guidePaymentStatus: status } }
              : p
          )
        );
      }
    } finally {
      setLoading((prev) => ({ ...prev, [appId]: false }));
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

      {/* Budget summary */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Финансовый отчёт группы
          </h2>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium">Ожидается собрать</p>
              <p className="text-lg font-bold text-blue-800 mt-0.5">
                {expectedBudget.toLocaleString()} {expCurrency || "KGS"}
              </p>
              <p className="text-xs text-blue-400 mt-0.5">
                {toPay.length} ожидают · {collected.length} собрано
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs text-orange-600 font-medium">Расходы на тур</p>
              <p className="text-lg font-bold text-orange-800 mt-0.5">
                {totalExpenses.toLocaleString()} {expCurrency}
              </p>
              <p className="text-xs text-orange-400 mt-0.5">{expenses.length} статей</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium">Собрано гидом</p>
              <p className="text-lg font-bold text-green-800 mt-0.5">
                {collectedAmount.toLocaleString()} {expCurrency || "KGS"}
              </p>
            </div>
            <div className={`rounded-lg p-3 ${net >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
              <p className={`text-xs font-medium ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {net >= 0 ? "Сдать финансисту" : "Получить от финансиста"}
              </p>
              <p className={`text-lg font-bold mt-0.5 ${net >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                {Math.abs(net).toLocaleString()} {expCurrency || "KGS"}
              </p>
            </div>
          </div>

          {(noShows.length > 0 || transferred.length > 0) && (
            <div className="text-xs text-gray-400 pt-1 border-t border-gray-100 space-y-0.5">
              {noShows.length > 0 && (
                <p>Не явились ({noShows.length}): остатки не входят в бюджет гида</p>
              )}
              {transferred.length > 0 && (
                <p>Перевели менеджеру ({transferred.length}): остатки не входят в бюджет гида</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expenses list */}
      {expenses.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Расходы
            </h2>
          </div>
          <div className="divide-y divide-gray-50">
            {expenses.map((e) => (
              <div key={e.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-800">{e.category}</span>
                  {e.note && <span className="text-xs text-gray-400 ml-1.5">({e.note})</span>}
                </div>
                <span className="text-sm font-semibold text-orange-700">
                  {e.amount.toLocaleString()} {e.currency}
                </span>
              </div>
            ))}
            <div className="px-4 py-2.5 flex items-center justify-between bg-gray-50">
              <span className="text-xs font-semibold text-gray-600">Итого расходов</span>
              <span className="text-sm font-bold text-orange-700">
                {totalExpenses.toLocaleString()} {expCurrency}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Список туристов
          </h2>
          <span className="text-xs text-gray-400">
            {participants.length} записей
          </span>
        </div>

        {participants.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            Нет участников
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {participants.map((app, idx) => {
              const phone = app.client.whatsapp.replace(/\D/g, "");
              const bal = balance(app);
              const gps = (app.booking?.guidePaymentStatus ?? "PENDING") as GuidePaymentStatus;
              const cfg = STATUS_CONFIG[gps];
              const isLoading = loading[app.id];

              return (
                <div key={app.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 w-5 shrink-0">{idx + 1}.</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">{app.client.name}</span>
                          {app.persons > 1 && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              {app.persons} чел.
                            </span>
                          )}
                        </div>
                        {app.client.country && (
                          <p className="text-xs text-gray-400">{app.client.country}</p>
                        )}
                        <a
                          href={`https://wa.me/${phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:underline"
                        >
                          {app.client.whatsapp}
                        </a>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {app.booking && bal > 0 ? (
                        <p className="text-sm font-bold text-orange-600">
                          {bal.toLocaleString()} {app.booking.currency}
                        </p>
                      ) : (
                        <p className="text-xs text-green-600 font-medium">Нет остатка</p>
                      )}
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Payment status buttons */}
                  {app.booking && (
                    <div className="flex gap-1.5 flex-wrap">
                      {(["PAID", "TRANSFERRED", "NO_SHOW", "PENDING"] as GuidePaymentStatus[]).map((s) => {
                        const c = STATUS_CONFIG[s];
                        const isActive = gps === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setStatus(app.id, s)}
                            disabled={isLoading || isActive}
                            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                              isActive
                                ? `${c.bg} ${c.color} ring-2 ring-offset-1 ring-current`
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
                            } disabled:opacity-50`}
                          >
                            {isLoading ? "..." : c.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
