import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Header from "@/components/admin/Header";

const TOUR_TYPE_LABELS: Record<string, string> = {
  trekking: "Треккинг",
  relax: "Отдых",
  cultural: "Культурный",
  adventure: "Приключения",
  day_trip: "Однодневный",
  ski: "Горнолыжный",
};

export default async function ToursPage() {
  const session = await getServerSession(authOptions);
  const canEdit = ["ADMIN", "SENIOR_MANAGER"].includes(session?.user.role ?? "");

  const tours = await prisma.tour.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { departures: true, applications: true } },
    },
  });

  return (
    <>
      <Header title="Управление турами" />
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">Всего туров: {tours.length}</p>
          {canEdit && (
            <Link
              href="/admin/tours/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Новый тур
            </Link>
          )}
        </div>

        {tours.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">Туров пока нет</p>
            {canEdit && (
              <Link href="/admin/tours/new" className="text-blue-600 hover:underline text-sm">
                Создать первый тур
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Тур
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Цена
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Даты
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Заявки
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tours.map((tour) => (
                  <tr key={tour.id} className="hover:bg-blue-50 cursor-pointer transition-colors group">
                    <td className="px-5 py-4">
                      <Link href={`/admin/tours/${tour.id}`} className="block">
                        <p className="font-medium text-gray-900 group-hover:text-blue-700">{tour.title}</p>
                        <p className="text-xs text-gray-400 font-mono">{tour.slug}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      <Link href={`/admin/tours/${tour.id}`} className="block">
                        {TOUR_TYPE_LABELS[tour.tourType ?? ""] ?? tour.tourType ?? "—"}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-800 font-medium">
                      <Link href={`/admin/tours/${tour.id}`} className="block">
                        {tour.basePrice.toLocaleString("ru-RU")} сом
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      <Link href={`/admin/tours/${tour.id}`} className="block">
                        {tour._count.departures}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      <Link href={`/admin/tours/${tour.id}`} className="block">
                        {tour._count.applications}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/tours/${tour.id}`} className="block">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tour.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {tour.isActive ? "Активен" : "Неактивен"}
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
