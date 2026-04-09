"use client";

import { useState, useEffect } from "react";
import Header from "@/components/admin/Header";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  guide: "Гид",
  driver: "Водитель",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", role: "guide", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/staff")
      .then((r) => r.json())
      .then((d) => setStaff(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!form.name) return;
    setSaving(true);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const created = await res.json();
      setStaff((prev) => [...prev, created]);
      setForm({ name: "", role: "guide", phone: "" });
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить сотрудника?")) return;
    const res = await fetch(`/api/admin/staff/${id}`, { method: "DELETE" });
    if (res.ok) setStaff((prev) => prev.filter((s) => s.id !== id));
  }

  const guides = staff.filter((s) => s.role === "guide");
  const drivers = staff.filter((s) => s.role === "driver");

  return (
    <>
      <Header title="Персонал" />
      <div className="p-6 space-y-6">
        <div className="flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Добавить сотрудника
          </button>
        </div>

        {showForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-blue-800 mb-4">Новый сотрудник</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Имя</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Азамат Бекжанов"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Роль</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="guide">Гид</option>
                  <option value="driver">Водитель</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+996 700 000 000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAdd}
                disabled={saving || !form.name}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {saving ? "Сохраняем..." : "Сохранить"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Загружаем...</div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {/* Guides */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-blue-50">
                <h3 className="text-sm font-semibold text-blue-700">Гиды ({guides.length})</h3>
              </div>
              {guides.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">Нет гидов</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {guides.map((s) => (
                    <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drivers */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-green-50">
                <h3 className="text-sm font-semibold text-green-700">Водители ({drivers.length})</h3>
              </div>
              {drivers.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400 text-sm">Нет водителей</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {drivers.map((s) => (
                    <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.name}</p>
                        {s.phone && <p className="text-xs text-gray-400">{s.phone}</p>}
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
