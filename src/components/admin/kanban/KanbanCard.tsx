"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";

export type KanbanApplication = {
  id: string;
  status: string;
  persons: number;
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

const SOURCE_LABELS: Record<string, string> = {
  instagram: "IG",
  facebook: "FB",
  google: "G",
  referral: "Ref",
  whatsapp: "WA",
  website: "Web",
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function KanbanCard({ app }: { app: KanbanApplication }) {
  const router = useRouter();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const phone = app.client.whatsapp.replace(/\D/g, "");
  const balance = app.booking
    ? app.booking.finalPrice - app.booking.depositPaid
    : null;

  const handleCardClick = () => {
    router.push(`/admin/applications/${app.id}`);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-pointer active:cursor-grabbing select-none hover:border-blue-300 hover:shadow-md transition-all"
    >
      {/* Client name + source */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-semibold text-gray-900 text-sm leading-tight">
          {app.client.name}
        </span>
        {app.utmSource && (
          <span
            className="text-xs shrink-0 bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono"
            title={app.utmSource}
          >
            {SOURCE_LABELS[app.utmSource] ?? app.utmSource}
          </span>
        )}
      </div>

      {/* Tour */}
      <p className="text-xs text-gray-500 truncate mb-1.5">{app.tour.title}</p>

      {/* Persons */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
        <span>{app.persons} чел.</span>
      </div>

      {/* Financials */}
      {app.booking && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-800">
            {app.booking.finalPrice.toLocaleString()} {app.booking.currency}
          </span>
          {balance !== null && balance > 0 && (
            <span className="text-xs text-orange-600">
              ост. {balance.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {/* Payment status + actions */}
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

        <a
          href={`https://wa.me/${phone}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-green-500 hover:text-green-600 transition-colors"
          title={`WhatsApp: ${app.client.whatsapp}`}
        >
          <WhatsAppIcon className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}
