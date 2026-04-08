import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  website: "Сайт",
  referral: "Реферал",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; tag?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const query = searchParams.q?.trim() ?? "";
  const tagFilter = searchParams.tag?.trim() ?? "";

  const clients = await prisma.client.findMany({
    where: {
      AND: [
        query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { whatsapp: { contains: query } },
                { country: { contains: query, mode: "insensitive" } },
              ],
            }
          : {},
        tagFilter ? { tag: { contains: tagFilter, mode: "insensitive" } } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { applications: true } },
      applications: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { tour: { select: { title: true } } },
      },
    },
  });

  // Get total spend per client
  const clientsWithSpend = await Promise.all(
    clients.map(async (c) => {
      const bookings = await prisma.booking.findMany({
        where: {
          application: { clientId: c.id },
          paymentStatus: { in: ["PARTIAL", "PAID"] },
        },
        select: { finalPrice: true, depositPaid: true },
      });
      const totalSpend = bookings.reduce((sum, b) => sum + b.depositPaid, 0);
      return { ...c, totalSpend };
    })
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Клиенты</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clients.length} клиентов
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="mb-5">
        <div className="flex gap-3">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Поиск по имени, WhatsApp, стране..."
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Найти
          </button>
          {(query || tagFilter) && (
            <a
              href="/admin/clients"
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Сбросить
            </a>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Клиент
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  WhatsApp
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Страна
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Источник
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Заявок
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Сумма
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Последний тур
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {clientsWithSpend.map((client) => {
                const phone = client.whatsapp.replace(/\D/g, "");
                const lastTour = client.applications[0]?.tour?.title;
                return (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {client.name}
                      </div>
                      {client.tag && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                          {client.tag}
                        </span>
                      )}
                      {client.noShow && (
                        <span className="ml-1 text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded">
                          Не явился
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://wa.me/${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800 hover:underline"
                      >
                        {client.whatsapp}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {[client.city, client.country]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {client.source
                        ? (SOURCE_LABELS[client.source] ?? client.source)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        {client._count.applications}
                      </span>
                      {client._count.applications > 1 && (
                        <span className="ml-1 text-xs text-green-600 font-medium">
                          ↺
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {client.totalSpend > 0
                        ? `${client.totalSpend.toLocaleString()} сом`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px]">
                      <span className="truncate block">{lastTour ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Открыть →
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {clients.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-gray-400"
                  >
                    {query ? `По запросу «${query}» ничего не найдено` : "Клиентов пока нет"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
