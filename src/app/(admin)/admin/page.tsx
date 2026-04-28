import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACT: "bg-yellow-100 text-yellow-700",
  PROPOSAL: "bg-purple-100 text-purple-700",
  DEPOSIT: "bg-orange-100 text-orange-700",
  NO_SHOW: "bg-red-100 text-red-700",
  ON_TOUR: "bg-green-100 text-green-700",
  FEEDBACK: "bg-teal-100 text-teal-700",
  ARCHIVE: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новая",
  CONTACT: "Контакт",
  PROPOSAL: "КП",
  DEPOSIT: "Предоплата",
  NO_SHOW: "Не явился",
  ON_TOUR: "В туре",
  FEEDBACK: "Отзыв",
  ARCHIVE: "Архив",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const isManager = session?.user.role === "MANAGER";
  const userId = session?.user.id;

  let stats = {
    newToday: 0,
    inProgress: 0,
    totalClients: 0,
    activeTours: 0,
  };

  let recentApplications: {
    id: string;
    status: string;
    client: { name: string; whatsapp: string };
    tour: { title: string };
    createdAt: Date;
  }[] = [];

  let upcomingTours: {
    id: string;
    departureDate: Date;
    tour: { title: string };
    applications: { persons: number; status: string }[];
  }[] = [];

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 14);

    const [newToday, inProgress, totalClients, activeTours, recent, upcoming] =
      await Promise.all([
        prisma.application.count({
          where: {
            createdAt: { gte: today, lt: tomorrow },
            ...(isManager
              ? { OR: [{ managerId: userId }, { managerId: null }] }
              : {}),
          },
        }),
        prisma.application.count({
          where: {
            status: { in: ["CONTACT", "PROPOSAL", "DEPOSIT"] },
            ...(isManager
              ? { OR: [{ managerId: userId }, { managerId: null }] }
              : {}),
          },
        }),
        isManager ? Promise.resolve(0) : prisma.client.count(),
        isManager
          ? Promise.resolve(0)
          : prisma.tour.count({ where: { isActive: true } }),
        prisma.application.findMany({
          where: isManager
            ? { OR: [{ managerId: userId }, { managerId: null }] }
            : {},
          orderBy: { createdAt: "desc" },
          take: 8,
          include: {
            client: { select: { name: true, whatsapp: true } },
            tour: { select: { title: true } },
          },
        }),
        prisma.departure.findMany({
          where: {
            departureDate: { gte: today, lte: nextWeek },
            status: "OPEN",
          },
          orderBy: { departureDate: "asc" },
          take: 5,
          include: {
            tour: { select: { title: true } },
            applications: {
              select: { persons: true, status: true },
            },
          },
        }),
      ]);

    stats = { newToday, inProgress, totalClients, activeTours };
    recentApplications = recent;
    upcomingTours = upcoming;
  } catch {
    // DB not available
  }

  const statCards = [
    {
      label: "Новых сегодня",
      value: stats.newToday,
      color: "bg-blue-500",
      href: "/admin/applications",
    },
    {
      label: "В работе",
      value: stats.inProgress,
      color: "bg-orange-500",
      href: "/admin/applications",
    },
    ...(!isManager
      ? [
          {
            label: "Клиентов",
            value: stats.totalClients,
            color: "bg-green-500",
            href: "/admin/clients",
          },
          {
            label: "Активных туров",
            value: stats.activeTours,
            color: "bg-purple-500",
            href: "/admin/tours",
          },
        ]
      : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Добро пожаловать,{" "}
          <span className="font-medium text-gray-700">
            {session?.user.name}
          </span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 hover:border-blue-300 transition-colors"
          >
            <div
              className={`w-11 h-11 rounded-xl ${stat.color} flex items-center justify-center shrink-0`}
            >
              <span className="text-white text-lg font-bold">{stat.value}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Recent applications */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">
              Последние заявки
            </h2>
            <Link
              href="/admin/applications"
              className="text-xs text-blue-600 hover:underline"
            >
              Все заявки →
            </Link>
          </div>
          {recentApplications.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              Заявок пока нет
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentApplications.map((app) => {
                const s = STATUS_LABELS[app.status];
                const color = STATUS_COLORS[app.status];
                const phone = app.client.whatsapp.replace(/\D/g, "");
                return (
                  <div
                    key={app.id}
                    className="px-5 py-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/applications/${app.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                        >
                          {app.client.name}
                        </Link>
                        {s && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${color}`}
                          >
                            {s}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {app.tour.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <a
                        href={`https://wa.me/${phone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-500 hover:text-green-700"
                      >
                        💬
                      </a>
                      <span className="text-xs text-gray-400">
                        {new Date(app.createdAt).toLocaleDateString("ru", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming tours */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">
              Ближайшие отправления (14 дней)
            </h2>
            <Link
              href="/admin/calendar"
              className="text-xs text-blue-600 hover:underline"
            >
              Календарь →
            </Link>
          </div>
          {upcomingTours.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">
              Отправлений нет
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcomingTours.map((dep) => (
                <div key={dep.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {dep.tour.title}
                    </p>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                      {new Date(dep.departureDate).toLocaleDateString("ru", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(dep.applications ?? []).filter(a => a.status !== "ARCHIVE").reduce((s, a) => s + a.persons, 0)} чел.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Быстрые действия
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/admin/applications", label: "Kanban заявки" },
            { href: "/admin/clients", label: "База клиентов" },
            { href: "/admin/tours", label: "Управление турами" },
            { href: "/admin/calendar", label: "Календарь групп" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center justify-center text-center bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
