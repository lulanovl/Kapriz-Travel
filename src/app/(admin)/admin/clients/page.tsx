import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ClientsTable from "@/components/admin/ClientsTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; tag?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const query = searchParams.q?.trim() ?? "";
  const tagFilter = searchParams.tag?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));

  const where = {
    AND: [
      query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" as const } },
              { whatsapp: { contains: query } },
              { country: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {},
      tagFilter ? { tag: { contains: tagFilter, mode: "insensitive" as const } } : {},
    ],
  };

  const [total, clients] = await Promise.all([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        _count: { select: { applications: true } },
        applications: {
          orderBy: { createdAt: "desc" },
          include: {
            booking: {
              select: { finalPrice: true, depositPaid: true, paymentStatus: true },
            },
            tour: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  const clientsWithSpend = clients.map((c) => {
    const totalSpend = c.applications.reduce((sum, app) => {
      const b = app.booking;
      if (!b || b.paymentStatus === "PENDING") return sum;
      return sum + (b.paymentStatus === "PAID" ? b.finalPrice : b.depositPaid);
    }, 0);
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
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tagFilter) params.set("tag", tagFilter);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/clients${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Клиенты</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} клиентов
            {totalPages > 1 && ` · страница ${page} из ${totalPages}`}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} из {total}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={pageHref(page - 1)}
                  className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
                >
                  ← Назад
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={pageHref(page + 1)}
                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                >
                  Вперёд →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
