"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";

export type KanbanApplication = {
  id: string;
  status: string;
  persons: number;
  preferredDate: string | null;
  utmSource: string | null;
  createdAt: string;
  client: { id: string; name: string; whatsapp: string; country: string | null };
  tour: { id: string; title: string };
  manager: { id: string; name: string } | null;
  booking: {
    finalPrice: number;
    depositPaid: number;
    paymentStatus: string;
    currency: string;
  } | null;
};

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-500",
  PARTIAL: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Без оплаты",
  PARTIAL: "Частично",
  PAID: "Оплачено",
};

const SOURCE_ICONS: Record<string, string> = {
  instagram: "📸",
  facebook: "📘",
  google: "🔍",
  referral: "🤝",
  website: "🌐",
};

export default function KanbanCard({ app }: { app: KanbanApplication }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const phone = app.client.whatsapp.replace(/\D/g, "");
  const balance = app.booking
    ? app.booking.finalPrice - app.booking.depositPaid
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing select-none hover:border-blue-300 transition-colors"
    >
      {/* Client name + source */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-medium text-gray-900 text-sm leading-tight">
          {app.client.name}
        </span>
        {app.utmSource && (
          <span className="text-base shrink-0" title={app.utmSource}>
            {SOURCE_ICONS[app.utmSource] ?? "📌"}
          </span>
        )}
      </div>

      {/* Tour */}
      <p className="text-xs text-gray-500 truncate mb-2">{app.tour.title}</p>

      {/* Persons + date */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
        <span>{app.persons} чел.</span>
        {app.preferredDate && (
          <>
            <span>·</span>
            <span>{app.preferredDate}</span>
          </>
        )}
      </div>

      {/* Financials */}
      {app.booking && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-700">
            {app.booking.finalPrice.toLocaleString()} {app.booking.currency}
          </span>
          {balance !== null && balance > 0 && (
            <span className="text-xs text-orange-600">
              остаток: {balance.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Payment status + WhatsApp */}
      <div className="flex items-center justify-between">
        {app.booking ? (
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full ${
              PAYMENT_STATUS_COLOR[app.booking.paymentStatus] ??
              "bg-gray-100 text-gray-500"
            }`}
          >
            {PAYMENT_STATUS_LABEL[app.booking.paymentStatus] ??
              app.booking.paymentStatus}
          </span>
        ) : (
          <span className="text-xs text-gray-300">Нет брони</span>
        )}

        <div className="flex items-center gap-1">
          <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-green-500 hover:text-green-700 text-sm"
            title={app.client.whatsapp}
          >
            💬
          </a>
          <Link
            href={`/admin/applications/${app.id}`}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-blue-400 hover:text-blue-600 text-sm"
            title="Открыть заявку"
          >
            →
          </Link>
        </div>
      </div>
    </div>
  );
}
