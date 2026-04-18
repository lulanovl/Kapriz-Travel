import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ClientsTable from "@/components/admin/ClientsTable";

export const dynamic = "force-dynamic";

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

  // Total spend: sum finalPrice for PAID bookings, depositPaid for PARTIAL
  const clientsWithSpend = await Promise.all(
    clients.map(async (c) => {
      const bookings = await prisma.booking.findMany({
        where: {
          application: { clientId: c.id },
          paymentStatus: { in: ["PARTIAL", "PAID"] },
        },
        select: { finalPrice: true, depositPaid: true, paymentStatus: true },
      });
      const totalSpend = bookings.reduce(
        (sum, b) => sum + (b.paymentStatus === "PAID" ? b.finalPrice : b.depositPaid),
        0
      );
      return {
        id: c.id,
        name: c.name,
        whatsapp: c.whatsapp,
        country: c.country,
        city: c.city,
        source: c.source,
        tag: c.tag,
        noShow: c.noShow,
        totalSpend,
        applicationCount: c._count.applications,
        lastTour: c.applications[0]?.tour?.title ?? null,
      };
    })
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Клиенты</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} клиентов</p>
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
                <th className="text-left px-4 py-3 font-medium text-gray-500">Клиент</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">WhatsApp</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Страна</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Источник</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Заявок</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Сумма</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Последний тур</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              <ClientsTable clients={clientsWithSpend} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
