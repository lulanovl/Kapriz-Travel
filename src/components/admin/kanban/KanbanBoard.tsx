"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import KanbanCard, { KanbanApplication } from "./KanbanCard";

const COLUMNS: { id: string; label: string; color: string; headerColor: string }[] = [
  { id: "NEW",      label: "Новая",          color: "bg-blue-50 border-blue-200",    headerColor: "text-blue-700"   },
  { id: "CONTACT",  label: "Контакт",        color: "bg-yellow-50 border-yellow-200", headerColor: "text-yellow-700" },
  { id: "DEPOSIT",  label: "Предоплата",     color: "bg-orange-50 border-orange-200", headerColor: "text-orange-700" },
  { id: "IN_BUS",   label: "Распределение",  color: "bg-indigo-50 border-indigo-200", headerColor: "text-indigo-700" },
  { id: "ON_TOUR",  label: "В туре",         color: "bg-green-50 border-green-200",   headerColor: "text-green-700"  },
  { id: "FEEDBACK", label: "Отзыв",          color: "bg-teal-50 border-teal-200",     headerColor: "text-teal-700"   },
  { id: "ARCHIVE",  label: "Архив",          color: "bg-gray-50 border-gray-200",     headerColor: "text-gray-500"   },
];

// Separate component so useDroppable can be called as a hook
function DroppableColumn({
  col,
  colApps,
}: {
  col: (typeof COLUMNS)[number];
  colApps: KanbanApplication[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div
      className={`flex-shrink-0 w-64 rounded-xl border ${col.color} flex flex-col`}
      style={{ maxHeight: "calc(100vh - 180px)" }}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-inherit shrink-0">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold uppercase tracking-wide ${col.headerColor}`}>
            {col.label}
          </span>
          <span className="text-xs text-gray-400 bg-white rounded-full px-1.5 py-0.5 border border-gray-200">
            {colApps.length}
          </span>
        </div>
      </div>

      {/* Scrollable drop zone */}
      <SortableContext
        id={col.id}
        items={colApps.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`flex-1 p-2 space-y-2 overflow-y-auto min-h-[80px] transition-colors ${
            isOver ? "bg-blue-100/40" : ""
          }`}
        >
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
}

export default function KanbanBoard({
  initialApplications,
}: {
  initialApplications: KanbanApplication[];
}) {
  const router = useRouter();
  const [applications, setApplications] =
    useState<KanbanApplication[]>(initialApplications);
  const [activeApp, setActiveApp] = useState<KanbanApplication | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getColumnApps = useCallback(
    (colId: string) => {
      if (colId === "CONTACT") {
        // Legacy PROPOSAL apps shown here until manually moved
        return applications.filter((a) => a.status === "CONTACT" || a.status === "PROPOSAL");
      }
      return applications.filter((a) => a.status === colId);
    },
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
    const originalApp = activeApp; // capture before clearing
    setActiveApp(null);

    if (!over || !originalApp) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const overColumn = COLUMNS.find((c) => c.id === overId);
    const overApp = applications.find((a) => a.id === overId);

    const newStatus = overColumn ? overColumn.id : overApp?.status;
    if (!newStatus) return;

    if (originalApp.status === newStatus) return;

    try {
      const res = await fetch(`/api/admin/applications/${activeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("failed");
      router.refresh();
    } catch {
      // Revert optimistic update
      setApplications((prev) =>
        prev.map((a) =>
          a.id === activeId ? { ...a, status: originalApp.status } : a
        )
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
      <div className="flex gap-3 pb-4" style={{ minHeight: "calc(100vh - 180px)" }}>
        {COLUMNS.map((col) => (
          <DroppableColumn
            key={col.id}
            col={col}
            colApps={getColumnApps(col.id)}
          />
        ))}
      </div>

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
