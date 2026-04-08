"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import KanbanCard, { KanbanApplication } from "./KanbanCard";

const COLUMNS: { id: string; label: string; color: string }[] = [
  { id: "NEW", label: "Новая", color: "bg-blue-50 border-blue-200" },
  { id: "CONTACT", label: "Контакт", color: "bg-yellow-50 border-yellow-200" },
  { id: "PROPOSAL", label: "КП", color: "bg-purple-50 border-purple-200" },
  { id: "DEPOSIT", label: "Предоплата", color: "bg-orange-50 border-orange-200" },
  { id: "NO_SHOW", label: "Не явился", color: "bg-red-50 border-red-200" },
  { id: "ON_TOUR", label: "В туре", color: "bg-green-50 border-green-200" },
  { id: "FEEDBACK", label: "Отзыв", color: "bg-teal-50 border-teal-200" },
  { id: "ARCHIVE", label: "Архив", color: "bg-gray-50 border-gray-200" },
];

const COLUMN_HEADER_COLORS: Record<string, string> = {
  NEW: "text-blue-700",
  CONTACT: "text-yellow-700",
  PROPOSAL: "text-purple-700",
  DEPOSIT: "text-orange-700",
  NO_SHOW: "text-red-700",
  ON_TOUR: "text-green-700",
  FEEDBACK: "text-teal-700",
  ARCHIVE: "text-gray-500",
};

export default function KanbanBoard({
  initialApplications,
}: {
  initialApplications: KanbanApplication[];
}) {
  const [applications, setApplications] =
    useState<KanbanApplication[]>(initialApplications);
  const [activeApp, setActiveApp] = useState<KanbanApplication | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getColumnApps = useCallback(
    (status: string) => applications.filter((a) => a.status === status),
    [applications]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const app = applications.find((a) => a.id === event.active.id);
    if (app) setActiveApp(app);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // overId could be a column id or a card id
    const overColumn = COLUMNS.find((c) => c.id === overId);
    const overApp = applications.find((a) => a.id === overId);

    if (!overColumn && !overApp) return;

    const newStatus = overColumn ? overColumn.id : overApp?.status;
    if (!newStatus) return;

    setApplications((prev) =>
      prev.map((a) => (a.id === activeId ? { ...a, status: newStatus } : a))
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveApp(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const overColumn = COLUMNS.find((c) => c.id === overId);
    const overApp = applications.find((a) => a.id === overId);

    const newStatus = overColumn ? overColumn.id : overApp?.status;
    if (!newStatus) return;

    const app = applications.find((a) => a.id === activeId);
    if (!app || app.status === newStatus) return;

    // Persist to server
    try {
      await fetch(`/api/admin/applications/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Revert on failure
      setApplications((prev) =>
        prev.map((a) => (a.id === activeId ? { ...a, status: app.status } : a))
      );
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-180px)]">
        {COLUMNS.map((col) => {
          const colApps = getColumnApps(col.id);
          return (
            <div
              key={col.id}
              id={col.id}
              className={`flex-shrink-0 w-64 rounded-xl border ${col.color} flex flex-col`}
            >
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-inherit">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      COLUMN_HEADER_COLORS[col.id]
                    }`}
                  >
                    {col.label}
                  </span>
                  <span className="text-xs text-gray-400 bg-white rounded-full px-1.5 py-0.5 border border-gray-200">
                    {colApps.length}
                  </span>
                </div>
              </div>

              {/* Drop zone */}
              <SortableContext
                id={col.id}
                items={colApps.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex-1 p-2 space-y-2 min-h-[80px]">
                  {colApps.map((app) => (
                    <KanbanCard key={app.id} app={app} />
                  ))}
                  {colApps.length === 0 && (
                    <div className="h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-gray-300">Пусто</span>
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeApp && (
          <div className="opacity-90 rotate-2 shadow-xl">
            <KanbanCard app={activeApp} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
