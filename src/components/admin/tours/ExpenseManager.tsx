"use client";

import { useState, useEffect } from "react";

interface Expense {
  id: string;
  category: string;
  amount: number;
  currency: string;
  note: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  GUIDE: "Гид",
  DRIVER: "Водитель",
  TRANSPORT: "Транспорт",
  ACCOMMODATION: "Проживание",
  FOOD: "Питание",
  OTHER: "Прочее",
};

const CATEGORY_COLORS: Record<string, string> = {
  GUIDE: "bg-purple-100 text-purple-700",
  DRIVER: "bg-green-100 text-green-700",
  TRANSPORT: "bg-blue-100 text-blue-700",
  ACCOMMODATION: "bg-orange-100 text-orange-700",
  FOOD: "bg-yellow-100 text-yellow-700",
  OTHER: "bg-gray-100 text-gray-600",
};

interface Props {
  tourDateId: string;
}

const emptyForm = { category: "GUIDE", amount: "", currency: "KGS", note: "" };

export default function ExpenseManager({ tourDateId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expanded && !loaded) {
      fetch(`/api/admin/tour-dates/${tourDateId}/expenses`)
        .then((r) => r.json())
        .then((d) => {
          setExpenses(Array.isArray(d) ? d : []);
          setLoaded(true);
        });
    }
  }, [expanded, loaded, tourDateId]);

  async function handleAdd() {
    if (!form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    const res = await fetch(`/api/admin/tour-dates/${tourDateId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    if (res.ok) {
      const created = await res.json();
      setExpenses((prev) => [...prev, created]);
      setForm(emptyForm);
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить расход?")) return;
    const res = await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
    if (res.ok) setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  // Group totals by currency
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    totals[e.currency] = (totals[e.currency] ?? 0) + e.amount;
  }

  const inputClass =
    "border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>▶</span>
        <span>
          Расходы
          {loaded && expenses.length > 0 && (
            <span className="ml-1 text-orange-600 font-medium">
              ({Object.entries(totals).map(([c, v]) => `${v.toLocaleString("ru")} ${c}`).join(" + ")})
            </span>
          )}
        </span>
      </button>

      {expanded && (
        <div className="mt-2 ml-4">
          {expenses.length === 0 && loaded ? (
            <p className="text-xs text-gray-400 mb-2">Нет расходов</p>
          ) : (
            <div className="space-y-1 mb-2">
              {expenses.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[e.category] ?? "bg-gray-100 text-gray-600"}`}>
                    {CATEGORY_LABELS[e.category] ?? e.category}
                  </span>
                  <span className="font-medium text-gray-800">
                    {e.amount.toLocaleString("ru")} {e.currency}
                  </span>
                  {e.note && <span className="text-gray-400 truncate max-w-[180px]">{e.note}</span>}
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="ml-auto text-red-400 hover:text-red-600"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {showForm ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2">
              <div className="flex flex-wrap gap-2">
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={inputClass}
                >
                  {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="Сумма"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  onFocus={(e) => e.target.select()}
                  className={`${inputClass} w-28`}
                />
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className={inputClass}
                >
                  <option value="KGS">KGS</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <input
                  type="text"
                  placeholder="Примечание (необязательно)"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className={`${inputClass} flex-1 min-w-[140px]`}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAdd}
                  disabled={saving || !form.amount}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded-lg text-xs font-medium"
                >
                  {saving ? "..." : "Добавить"}
                </button>
                <button
                  onClick={() => { setShowForm(false); setForm(emptyForm); }}
                  className="px-3 py-1 rounded-lg text-xs text-gray-600 border border-gray-300 hover:bg-gray-100"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              + Добавить расход
            </button>
          )}
        </div>
      )}
    </div>
  );
}
