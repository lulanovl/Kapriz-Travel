"use client";

import { useRouter } from "next/navigation";

const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  website: "Сайт",
  referral: "Реферал",
};

export type ClientRow = {
  id: string;
  name: string;
  whatsapp: string;
  country: string | null;
  city: string | null;
  source: string | null;
  tag: string | null;
  noShow: boolean;
  totalSpend: number;
  applicationCount: number;
  lastTour: string | null;
};

export default function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();

  if (clients.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="px-4 py-16 text-center text-gray-400">
          Клиентов пока нет
        </td>
      </tr>
    );
  }

  return (
    <>
      {clients.map((client) => {
        const phone = client.whatsapp.replace(/\D/g, "");
        return (
          <tr
            key={client.id}
            onClick={() => router.push(`/admin/clients/${client.id}`)}
            className="hover:bg-blue-50 cursor-pointer transition-colors"
          >
            <td className="px-4 py-3">
              <div className="font-medium text-gray-900">{client.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                {client.tag && (
                  <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                    {client.tag}
                  </span>
                )}
                {client.noShow && (
                  <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded">
                    Не явился
                  </span>
                )}
              </div>
            </td>
            <td className="px-4 py-3">
              <a
                href={`https://wa.me/${phone}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-green-600 hover:text-green-800 hover:underline"
              >
                {client.whatsapp}
              </a>
            </td>
            <td className="px-4 py-3 text-gray-600">
              {[client.city, client.country].filter(Boolean).join(", ") || "—"}
            </td>
            <td className="px-4 py-3 text-gray-500 text-xs">
              {client.source ? (SOURCE_LABELS[client.source] ?? client.source) : "—"}
            </td>
            <td className="px-4 py-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                {client.applicationCount}
              </span>
              {client.applicationCount > 1 && (
                <span className="ml-1 text-xs text-green-600 font-medium">↺</span>
              )}
            </td>
            <td className="px-4 py-3 text-gray-700 font-medium">
              {client.totalSpend > 0
                ? `${client.totalSpend.toLocaleString()} сом`
                : "—"}
            </td>
            <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px]">
              <span className="truncate block">{client.lastTour ?? "—"}</span>
            </td>
          </tr>
        );
      })}
    </>
  );
}
