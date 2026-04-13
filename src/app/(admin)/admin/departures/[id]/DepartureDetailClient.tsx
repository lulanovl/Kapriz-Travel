"use client";

import { useState } from "react";
import Link from "next/link";

interface Client { id: string; name: string; whatsapp: string; country: string | null }
interface Booking { id: string; finalPrice: number; depositPaid: number; paymentStatus: string; currency: string }
interface Application {
  id: string; persons: number; status: string;
  client: Client; booking: Booking | null;
  manager?: { id: string; name: string } | null;
}
interface Expense {
  id: string; category: string; amount: number; currency: string; note: string | null;
}
interface Group {
  id: string; name: string; maxSeats: number;
  guide: { id: string; name: string; phone: string | null } | null;
  driver: { id: string; name: string; phone: string | null } | null;
  applications: Application[];
  _count: { applications: number };
  expenses: Expense[];
}
interface Departure {
  id: string; departureDate: string; status: string; note: string | null;
  tour: { id: string; title: string; slug: string; basePrice: number };
  groups: Group[];
  applications: Application[]; // unassigned
}
interface Staff { id: string; name: string; role: string; phone: string | null }

interface Props {
  departure: Departure;
  staff: Staff[];
  canEdit: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACT: "bg-indigo-100 text-indigo-700",
  PROPOSAL: "bg-purple-100 text-purple-700",
  DEPOSIT: "bg-green-100 text-green-700",
  NO_SHOW: "bg-red-100 text-red-700",
  ON_TOUR: "bg-teal-100 text-teal-700",
  FEEDBACK: "bg-yellow-100 text-yellow-700",
  ARCHIVE: "bg-gray-100 text-gray-500",
};
const STATUS_LABELS: Record<string, string> = {
  NEW: "Новая", CONTACT: "Контакт", PROPOSAL: "КП", DEPOSIT: "Предоплата",
  NO_SHOW: "Не явился", ON_TOUR: "В туре", FEEDBACK: "Отзыв", ARCHIVE: "Архив",
};

const EXPENSE_CURRENCIES = ["KGS", "USD", "EUR"];

function WaLink({ phone }: { phone: string }) {
  const clean = phone.replace(/\D/g, "");
  return (
    <a href={`https://wa.me/${clean}`} target="_blank" rel="noopener noreferrer"
      className="text-green-600 hover:underline text-xs">
      {phone}
    </a>
  );
}

function AppCard({ app, selected, onSelect, canEdit }: {
  app: Application; selected: boolean; onSelect: () => void; canEdit: boolean;
}) {
  const balance = app.booking ? app.booking.finalPrice - app.booking.depositPaid : null;
  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${
      selected ? "bg-blue-50" : "hover:bg-gray-50"
    }`}>
      {canEdit && (
        <input type="checkbox" checked={selected} onChange={onSelect}
          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/admin/applications/${app.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
            {app.client.name}
          </Link>
          {app.persons > 1 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{app.persons} чел.</span>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABELS[app.status] ?? app.status}
          </span>
        </div>
        {app.client.country && <p className="text-xs text-gray-400">{app.client.country}</p>}
        <WaLink phone={app.client.whatsapp} />
      </div>
      {app.booking && (
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-gray-800">
            {app.booking.finalPrice.toLocaleString()} {app.booking.currency}
          </p>
          {balance !== null && balance > 0 && (
            <p className="text-xs text-orange-600">Долг: {balance.toLocaleString()}</p>
          )}
          {app.booking.paymentStatus === "PAID" && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Оплачено</span>
          )}
        </div>
      )}
    </div>
  );
}

type ExpenseForm = { category: string; amount: string; currency: string; note: string };

export default function DepartureDetailClient({ departure, staff, canEdit }: Props) {
  const guides = staff.filter((s) => s.role === "guide");
  const drivers = staff.filter((s) => s.role === "driver");

  const [groups, setGroups] = useState<Group[]>(departure.groups);
  const [unassigned, setUnassigned] = useState<Application[]>(departure.applications);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Create group form
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", guideId: "", driverId: "", maxSeats: "15" });
  const [createLoading, setCreateLoading] = useState(false);

  // Edit group
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", guideId: "", driverId: "", maxSeats: "15" });
  const [editLoading, setEditLoading] = useState(false);

  // Expenses state
  const [groupExpenses, setGroupExpenses] = useState<Record<string, Expense[]>>(
    () => Object.fromEntries(departure.groups.map((g) => [g.id, g.expenses]))
  );
  const [expenseForms, setExpenseForms] = useState<Record<string, ExpenseForm>>(
    () => Object.fromEntries(departure.groups.map((g) => [g.id, { category: "", amount: "", currency: "KGS", note: "" }]))
  );
  const [expenseLoading, setExpenseLoading] = useState<Record<string, boolean>>({});
  const [expenseVisible, setExpenseVisible] = useState<Record<string, boolean>>({});

  const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const unassignedPersons = unassigned.reduce((s, a) => s + a.persons, 0);
  const totalPersons = unassignedPersons + groups.reduce((s, g) => s + g.applications.reduce((s2, a) => s2 + a.persons, 0), 0);
  const selectedPersons = unassigned.filter((a) => selected.has(a.id)).reduce((s, a) => s + a.persons, 0);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === unassigned.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unassigned.map((a) => a.id)));
    }
  }

  async function handleCreateGroup() {
    if (!groupForm.name) return;
    setCreateLoading(true);
    const res = await fetch(`/api/admin/departures/${departure.id}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: groupForm.name,
        guideId: groupForm.guideId || null,
        driverId: groupForm.driverId || null,
        maxSeats: parseInt(groupForm.maxSeats) || 15,
      }),
    });
    setCreateLoading(false);
    if (res.ok) {
      const created = await res.json();
      setGroups((prev) => [...prev, { ...created, applications: [], expenses: [] }]);
      setGroupExpenses((prev) => ({ ...prev, [created.id]: [] }));
      setExpenseForms((prev) => ({ ...prev, [created.id]: { category: "", amount: "", currency: "KGS", note: "" } }));
      setGroupForm({ name: "", guideId: "", driverId: "", maxSeats: "15" });
      setShowCreateGroup(false);
    }
  }

  async function handleAssign(groupId: string) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const res = await fetch(`/api/admin/groups/${groupId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationIds: ids }),
    });
    if (res.ok) {
      const movedApps = unassigned.filter((a) => ids.includes(a.id));
      setUnassigned((prev) => prev.filter((a) => !ids.includes(a.id)));
      setGroups((prev) => prev.map((g) =>
        g.id === groupId
          ? { ...g, applications: [...g.applications, ...movedApps], _count: { applications: g._count.applications + movedApps.length } }
          : g
      ));
      setSelected(new Set());
    }
  }

  async function handleUnassign(groupId: string, appId: string) {
    const res = await fetch(`/api/admin/groups/${groupId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationIds: [appId], unassign: true }),
    });
    if (res.ok) {
      const group = groups.find((g) => g.id === groupId);
      const app = group?.applications.find((a) => a.id === appId);
      if (app) {
        setGroups((prev) => prev.map((g) =>
          g.id === groupId
            ? { ...g, applications: g.applications.filter((a) => a.id !== appId), _count: { applications: g._count.applications - 1 } }
            : g
        ));
        setUnassigned((prev) => [...prev, app]);
      }
    }
  }

  async function handleDeleteGroup(groupId: string) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    if (group.applications.length > 0) {
      if (!confirm(`В группе ${group.applications.length} туристов. Они будут переведены в нераспределённые. Продолжить?`)) return;
    } else {
      if (!confirm(`Удалить группу "${group.name}"?`)) return;
    }
    const res = await fetch(`/api/admin/groups/${groupId}`, { method: "DELETE" });
    if (res.ok) {
      const freed = group.applications;
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setUnassigned((prev) => [...prev, ...freed]);
      setGroupExpenses((prev) => { const n = { ...prev }; delete n[groupId]; return n; });
      setExpenseForms((prev) => { const n = { ...prev }; delete n[groupId]; return n; });
    }
  }

  function startEditGroup(group: Group) {
    setEditingGroupId(group.id);
    setEditForm({
      name: group.name,
      guideId: group.guide?.id ?? "",
      driverId: group.driver?.id ?? "",
      maxSeats: String(group.maxSeats),
    });
  }

  async function handleSaveGroup() {
    if (!editingGroupId) return;
    setEditLoading(true);
    const res = await fetch(`/api/admin/groups/${editingGroupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        guideId: editForm.guideId || null,
        driverId: editForm.driverId || null,
        maxSeats: parseInt(editForm.maxSeats) || 15,
      }),
    });
    setEditLoading(false);
    if (res.ok) {
      const updated = await res.json();
      setGroups((prev) => prev.map((g) =>
        g.id === editingGroupId ? { ...g, ...updated } : g
      ));
      setEditingGroupId(null);
    }
  }

  async function generateGuideToken(groupId: string) {
    const res = await fetch(`/api/admin/groups/${groupId}/guide-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: 30 }),
    });
    if (res.ok) {
      const data = await res.json();
      const url = `${window.location.origin}/guide/${data.token}`;
      await navigator.clipboard.writeText(url);
      alert(`Ссылка скопирована!\n${url}\n\nДействует до: ${new Date(data.expiresAt).toLocaleDateString("ru-RU")}`);
    }
  }

  async function handleAddExpense(groupId: string) {
    const form = expenseForms[groupId];
    if (!form?.category || !form?.amount) return;
    setExpenseLoading((prev) => ({ ...prev, [groupId]: true }));
    const res = await fetch(`/api/admin/groups/${groupId}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: form.category,
        amount: parseFloat(form.amount),
        currency: form.currency || "KGS",
        note: form.note || null,
      }),
    });
    setExpenseLoading((prev) => ({ ...prev, [groupId]: false }));
    if (res.ok) {
      const created = await res.json();
      setGroupExpenses((prev) => ({ ...prev, [groupId]: [...(prev[groupId] ?? []), created] }));
      setExpenseForms((prev) => ({ ...prev, [groupId]: { category: "", amount: "", currency: "KGS", note: "" } }));
    }
  }

  async function handleDeleteExpense(groupId: string, expenseId: string) {
    const res = await fetch(`/api/admin/expenses/${expenseId}`, { method: "DELETE" });
    if (res.ok) {
      setGroupExpenses((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] ?? []).filter((e) => e.id !== expenseId),
      }));
    }
  }

  const depDate = new Date(departure.departureDate).toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Выезд</p>
            <h2 className="text-xl font-bold text-gray-900 capitalize">{depDate}</h2>
            <p className="text-sm text-gray-500 mt-1">
              <Link href={`/admin/tours/${departure.tour.id}`} className="hover:text-blue-600">
                {departure.tour.title}
              </Link>
              {departure.note && <span className="ml-2 text-gray-400">· {departure.note}</span>}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{totalPersons}</p>
              <p className="text-xs text-gray-400">туристов</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{unassignedPersons}</p>
              <p className="text-xs text-gray-400">нераспред.</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{groups.length}</p>
              <p className="text-xs text-gray-400">автобусов</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: unassigned */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Нераспределённые
                <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                  {unassignedPersons} чел.
                </span>
              </h3>
              {canEdit && unassigned.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {selected.size === unassigned.length ? "Снять всё" : "Выбрать всё"}
                </button>
              )}
            </div>

            {unassigned.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                Все туристы распределены по автобусам
              </div>
            ) : (
              <div>
                {unassigned.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    selected={selected.has(app.id)}
                    onSelect={() => toggleSelect(app.id)}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            )}

            {selected.size > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 bg-blue-50">
                <p className="text-xs text-blue-700 font-medium mb-2">
                  Выбрано: {selected.size} заявок ({selectedPersons} чел.). Нажмите «В автобус» в нужной группе.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: groups */}
        <div className="col-span-2 space-y-4">
          {/* Create group button */}
          {canEdit && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Создать автобус
              </button>
            </div>
          )}

          {/* Create group form */}
          {showCreateGroup && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-blue-800 mb-4">Новый автобус / группа</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Название *</label>
                  <input
                    type="text"
                    placeholder="Автобус 1"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm((f) => ({ ...f, name: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Макс. мест</label>
                  <input
                    type="number"
                    min="1"
                    value={groupForm.maxSeats}
                    onChange={(e) => setGroupForm((f) => ({ ...f, maxSeats: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Гид</label>
                  <select value={groupForm.guideId} onChange={(e) => setGroupForm((f) => ({ ...f, guideId: e.target.value }))} className={inputClass}>
                    <option value="">— Не назначен —</option>
                    {guides.map((g) => <option key={g.id} value={g.id}>{g.name}{g.phone ? ` (${g.phone})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Водитель</label>
                  <select value={groupForm.driverId} onChange={(e) => setGroupForm((f) => ({ ...f, driverId: e.target.value }))} className={inputClass}>
                    <option value="">— Не назначен —</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}{d.phone ? ` (${d.phone})` : ""}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCreateGroup}
                  disabled={createLoading || !groupForm.name}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  {createLoading ? "Создаём..." : "Создать"}
                </button>
                <button onClick={() => setShowCreateGroup(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50">
                  Отмена
                </button>
              </div>
            </div>
          )}

          {/* Groups */}
          {groups.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              Нет автобусов. Создайте группу и распределите туристов.
            </div>
          ) : (
            groups.map((group) => {
              const isEditing = editingGroupId === group.id;
              const groupPersons = group.applications.reduce((s, a) => s + a.persons, 0);
              const fillRatio = group.maxSeats > 0 ? groupPersons / group.maxSeats : 0;
              const fillColor = fillRatio >= 1 ? "bg-red-500" : fillRatio >= 0.8 ? "bg-yellow-500" : "bg-green-500";
              const expenses = groupExpenses[group.id] ?? [];
              const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
              const showExpenses = expenseVisible[group.id] ?? false;
              const expForm = expenseForms[group.id] ?? { category: "", amount: "", currency: "KGS", note: "" };
              const isExpLoading = expenseLoading[group.id] ?? false;

              return (
                <div key={group.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Group header */}
                  <div className="px-5 py-4 border-b border-gray-100">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Название</label>
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Макс. мест</label>
                            <input
                              type="number"
                              min="1"
                              value={editForm.maxSeats}
                              onChange={(e) => setEditForm((f) => ({ ...f, maxSeats: e.target.value }))}
                              onFocus={(e) => e.target.select()}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Гид</label>
                            <select value={editForm.guideId} onChange={(e) => setEditForm((f) => ({ ...f, guideId: e.target.value }))} className={inputClass}>
                              <option value="">— Не назначен —</option>
                              {guides.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Водитель</label>
                            <select value={editForm.driverId} onChange={(e) => setEditForm((f) => ({ ...f, driverId: e.target.value }))} className={inputClass}>
                              <option value="">— Не назначен —</option>
                              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveGroup} disabled={editLoading} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50">
                            {editLoading ? "..." : "Сохранить"}
                          </button>
                          <button onClick={() => setEditingGroupId(null)} className="px-3 py-1.5 rounded-lg text-sm text-gray-600 border border-gray-300">
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="text-base font-semibold text-gray-900">{group.name}</h4>
                            <span className="text-sm text-gray-500">
                              {groupPersons}/{group.maxSeats} чел.
                            </span>
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                            {group.guide && <span className="text-blue-600">Гид: {group.guide.name}</span>}
                            {group.driver && <span className="text-green-600">Водитель: {group.driver.name}</span>}
                            {!group.guide && !group.driver && <span className="text-gray-400">Персонал не назначен</span>}
                          </div>
                          {/* Fill bar */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[160px]">
                              <div className={`h-1.5 rounded-full ${fillColor}`} style={{ width: `${Math.min(100, fillRatio * 100)}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">
                              {Math.max(0, group.maxSeats - groupPersons)} свободно
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {selected.size > 0 && canEdit && (
                            <button
                              onClick={() => handleAssign(group.id)}
                              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium"
                            >
                              В автобус ({selectedPersons} чел.)
                            </button>
                          )}
                          {canEdit && (
                            <>
                              <button
                                onClick={() => generateGuideToken(group.id)}
                                className="text-sm text-purple-600 hover:text-purple-800 px-3 py-1.5 rounded-lg hover:bg-purple-50 font-medium"
                                title="Скопировать ссылку для гида"
                              >
                                Гиду
                              </button>
                              <button
                                onClick={() => startEditGroup(group)}
                                className="text-sm text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                              >
                                Изменить
                              </button>
                              <button
                                onClick={() => handleDeleteGroup(group.id)}
                                className="text-sm text-gray-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50"
                              >
                                Удалить
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Group participants */}
                  {group.applications.length === 0 ? (
                    <div className="px-4 py-5 text-center text-gray-400 text-sm">
                      Нет туристов. Выберите туристов слева и нажмите «В автобус».
                    </div>
                  ) : (
                    <div>
                      {group.applications.map((app) => (
                        <div key={app.id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link href={`/admin/applications/${app.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                                {app.client.name}
                              </Link>
                              {app.persons > 1 && (
                                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{app.persons} чел.</span>
                              )}
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[app.status] ?? "bg-gray-100"}`}>
                                {STATUS_LABELS[app.status] ?? app.status}
                              </span>
                            </div>
                            <WaLink phone={app.client.whatsapp} />
                          </div>
                          {app.booking && (
                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-gray-800">
                                {app.booking.finalPrice.toLocaleString()} {app.booking.currency}
                              </p>
                              {app.booking.finalPrice - app.booking.depositPaid > 0 && (
                                <p className="text-xs text-orange-600">
                                  Долг: {(app.booking.finalPrice - app.booking.depositPaid).toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleUnassign(group.id, app.id)}
                              className="text-xs text-gray-400 hover:text-orange-600 px-2 py-1 rounded hover:bg-orange-50 shrink-0"
                              title="Убрать из группы"
                            >
                              ↩
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expenses section */}
                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => setExpenseVisible((prev) => ({ ...prev, [group.id]: !showExpenses }))}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <span>
                        Расходы
                        {expenses.length > 0 && (
                          <span className="ml-2 text-orange-600 font-semibold">
                            {totalExpenses.toLocaleString()} {expenses[0]?.currency ?? "KGS"}
                          </span>
                        )}
                      </span>
                      <svg className={`w-4 h-4 transition-transform ${showExpenses ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showExpenses && (
                      <div className="px-4 pb-4">
                        {/* Expense list */}
                        {expenses.length > 0 && (
                          <div className="mb-3 space-y-1.5">
                            {expenses.map((exp) => (
                              <div key={exp.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg text-xs">
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-gray-800">{exp.category}</span>
                                  {exp.note && <span className="text-gray-400 ml-1.5">({exp.note})</span>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="font-semibold text-gray-900">
                                    {exp.amount.toLocaleString()} {exp.currency}
                                  </span>
                                  {canEdit && (
                                    <button
                                      onClick={() => handleDeleteExpense(group.id, exp.id)}
                                      className="text-gray-300 hover:text-red-500 transition-colors"
                                      title="Удалить"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            <div className="flex justify-between px-3 py-1 text-xs font-semibold text-gray-700 border-t border-gray-200 mt-1 pt-2">
                              <span>Итого расходов:</span>
                              <span className="text-orange-600">{totalExpenses.toLocaleString()} {expenses[0]?.currency ?? "KGS"}</span>
                            </div>
                          </div>
                        )}

                        {/* Add expense form */}
                        {canEdit && (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="Статья расхода"
                              value={expForm.category}
                              onChange={(e) => setExpenseForms((prev) => ({ ...prev, [group.id]: { ...expForm, category: e.target.value } }))}
                              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="flex gap-1">
                              <input
                                type="number"
                                placeholder="Сумма"
                                value={expForm.amount}
                                onChange={(e) => setExpenseForms((prev) => ({ ...prev, [group.id]: { ...expForm, amount: e.target.value } }))}
                                onFocus={(e) => e.target.select()}
                                className="flex-1 min-w-0 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <select
                                value={expForm.currency}
                                onChange={(e) => setExpenseForms((prev) => ({ ...prev, [group.id]: { ...expForm, currency: e.target.value } }))}
                                className="border border-gray-300 rounded-lg px-1.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                {EXPENSE_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                              </select>
                            </div>
                            <input
                              type="text"
                              placeholder="Примечание (необязательно)"
                              value={expForm.note}
                              onChange={(e) => setExpenseForms((prev) => ({ ...prev, [group.id]: { ...expForm, note: e.target.value } }))}
                              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => handleAddExpense(group.id)}
                              disabled={isExpLoading || !expForm.category || !expForm.amount}
                              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                            >
                              {isExpLoading ? "..." : "+ Добавить"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
