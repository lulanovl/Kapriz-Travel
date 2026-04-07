import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Header from "@/components/admin/Header";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Stats (will grow in future milestones)
  let newApplicationsToday = 0;
  let totalClients = 0;
  let activeTours = 0;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    [newApplicationsToday, totalClients, activeTours] = await Promise.all([
      prisma.application.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.client.count(),
      prisma.tour.count({ where: { isActive: true } }),
    ]);
  } catch {
    // DB not connected yet — show zeros
  }

  const stats = [
    {
      label: "Новых заявок сегодня",
      value: newApplicationsToday,
      color: "bg-blue-500",
    },
    { label: "Всего клиентов", value: totalClients, color: "bg-green-500" },
    { label: "Активных туров", value: activeTours, color: "bg-purple-500" },
  ];

  return (
    <>
      <Header title="Дашборд" />
      <div className="flex-1 p-6">
        <div className="mb-6">
          <p className="text-gray-600">
            Добро пожаловать,{" "}
            <span className="font-semibold text-gray-900">
              {session?.user.name}
            </span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-4"
            >
              <div
                className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}
              >
                <span className="text-white text-xl font-bold">
                  {stat.value}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Быстрые действия
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/admin/applications", label: "Все заявки" },
              { href: "/admin/clients", label: "Клиенты" },
              { href: "/admin/tours", label: "Управление турами" },
              { href: "/admin/calendar", label: "Календарь групп" },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center justify-center text-center bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 transition-colors"
              >
                {action.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
