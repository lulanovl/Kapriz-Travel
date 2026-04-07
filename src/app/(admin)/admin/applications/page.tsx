import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  NEW: { label: "Новая", color: "bg-blue-100 text-blue-700" },
  CONTACT: { label: "Контакт", color: "bg-yellow-100 text-yellow-700" },
  PROPOSAL: { label: "Предложение", color: "bg-purple-100 text-purple-700" },
  DEPOSIT: { label: "Предоплата", color: "bg-orange-100 text-orange-700" },
  NO_SHOW: { label: "Не явился", color: "bg-red-100 text-red-700" },
  ON_TOUR: { label: "В туре", color: "bg-green-100 text-green-700" },
  FEEDBACK: { label: "Отзыв", color: "bg-teal-100 text-teal-700" },
  ARCHIVE: { label: "Архив", color: "bg-gray-100 text-gray-500" },
};

const UTM_SOURCE_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  website: "Сайт",
  referral: "Реферал",
};

export default async function ApplicationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isManager = session.user.role === "MANAGER";

  const applications = await prisma.application.findMany({
    where: isManager ? { managerId: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { name: true, whatsapp: true, country: true } },
      tour: { select: { title: true } },
      manager: { select: { name: true } },
    },
    take: 200,
  });

  const newCount = applications.filter((a) => a.status === "NEW").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Заявки</h1>
          <p className="text-gray-500 text-sm mt-1">
            {applications.length} всего
            {newCount > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {newCount} новых
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Клиент
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Тур
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Чел.
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Статус
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Источник
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Менеджер
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  Дата
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.map((app) => {
                const status =
                  STATUS_MAP[app.status] ?? {
                    label: app.status,
                    color: "bg-gray-100 text-gray-500",
                  };
                const phone = app.client.whatsapp.replace("+", "");
                const source = app.utmSource
                  ? (UTM_SOURCE_LABELS[app.utmSource] ?? app.utmSource)
                  : "—";

                return (
                  <tr
                    key={app.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {app.client.name}
                      </div>
                      <a
                        href={`https://wa.me/${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-green-600 transition-colors"
                      >
                        {app.client.whatsapp}
                      </a>
                      {app.client.country && (
                        <div className="text-xs text-gray-400">
                          {app.client.country}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px]">
                      <div className="truncate">{app.tour.title}</div>
                      {app.preferredDate && (
                        <div className="text-xs text-gray-400">
                          {app.preferredDate}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{app.persons}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {source}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-sm">
                      {app.manager?.name ?? (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(app.createdAt).toLocaleDateString("ru", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}

              {applications.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-gray-400"
                  >
                    Заявок пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        * Полный Kanban с комментариями и сменой статуса — в следующей версии
      </p>
    </div>
  );
}
