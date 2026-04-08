import Header from "@/components/admin/Header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in90days = new Date(today);
  in90days.setDate(today.getDate() + 90);

  const tourDates = await prisma.tourDate.findMany({
    where: { startDate: { gte: today, lte: in90days } },
    orderBy: { startDate: "asc" },
    include: {
      tour: { select: { title: true } },
      guide: { select: { name: true } },
      driver: { select: { name: true } },
      _count: { select: { applications: true } },
    },
  });

  const canManage = ["ADMIN", "SENIOR_MANAGER"].includes(session?.user.role ?? "");

  return (
    <>
      <Header title="Календарь групп" />
      <div className="p-6">
        <p className="text-sm text-gray-500 mb-6">Отправления на ближайшие 90 дней</p>

        {tourDates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            Нет запланированных отправлений
          </div>
        ) : (
          <div className="space-y-3">
            {tourDates.map((td) => {
              const free = td.maxSeats - td._count.applications;
              const pct = Math.round((td._count.applications / td.maxSeats) * 100);
              const barColor = pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-yellow-500" : "bg-green-500";

              return (
                <div key={td.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{td.tour.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatDate(td.startDate)} — {formatDate(td.endDate)}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        {td.guide && <span>Гид: {td.guide.name}</span>}
                        {td.driver && <span>Водитель: {td.driver.name}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-800">
                        {td._count.applications}/{td.maxSeats} чел.
                      </p>
                      <p className={`text-xs ${free <= 0 ? "text-red-600" : free <= 3 ? "text-yellow-600" : "text-green-600"}`}>
                        {free <= 0 ? "Мест нет" : `Свободно: ${free}`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
