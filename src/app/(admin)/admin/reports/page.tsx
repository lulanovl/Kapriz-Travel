import Header from "@/components/admin/Header";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ManagersReport from "./ManagersReport";

export const dynamic = "force-dynamic";

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!["ADMIN", "SENIOR_MANAGER", "FINANCE"].includes(session.user.role)) {
    redirect("/admin");
  }

  const period = searchParams.period ?? "month";
  const now = new Date();
  let dateFilter: { gte: Date; lte: Date } | undefined;

  if (period === "week") {
    const mon = getMondayOfWeek(now);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    dateFilter = { gte: mon, lte: sun };
  } else if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    dateFilter = { gte: start, lte: end };
  }

  // Batch 1: run 5 queries in parallel (connection pool limit = 5)
  // Include departure lookup here instead of a separate await
  const [totalApps, byStatus, bySource, topTours, periodDepartures] = await Promise.all([
    prisma.application.count(),
    prisma.application.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.application.groupBy({
      by: ["utmSource"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.application.groupBy({
      by: ["tourId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    dateFilter
      ? prisma.departure.findMany({ where: { departureDate: dateFilter }, select: { id: true } })
      : Promise.resolve(null as { id: string }[] | null),
  ]);

  const departureIds = periodDepartures?.map((d) => d.id) ?? null;

  // Batch 2: sequential — tourist aggregate (uses departure IDs from batch 1)
  const touristAgg = await prisma.application.aggregate({
    _sum: { persons: true },
    where: {
      status: { notIn: ["ARCHIVE"] },
      ...(departureIds ? { departureId: { in: departureIds } } : {}),
    },
  });

  const totalTourists = touristAgg._sum.persons ?? 0;

  const tourIds = topTours.map((t) => t.tourId);
  const tours = await prisma.tour.findMany({
    where: { id: { in: tourIds } },
    select: { id: true, title: true },
  });
  const tourMap = Object.fromEntries(tours.map((t) => [t.id, t.title]));

  const STATUS_LABELS: Record<string, string> = {
    NEW: "Новая",
    CONTACT: "Контакт",
    PROPOSAL: "КП",
    DEPOSIT: "Предоплата",
    IN_BUS: "В автобусе",
    NO_SHOW: "Не явился",
    ON_TOUR: "В туре",
    FEEDBACK: "Отзыв",
    ARCHIVE: "Архив",
  };

  const PERIOD_TABS = [
    { id: "week", label: "Неделя" },
    { id: "month", label: "Месяц" },
    { id: "all", label: "Всё время" },
  ];

  const periodLabel =
    period === "week" ? "за текущую неделю" :
    period === "month" ? "за текущий месяц" :
    "за всё время";

  const canSeeManagers = ["ADMIN", "SENIOR_MANAGER"].includes(session.user.role);

  return (
    <>
      <Header title="Отчёты" />
      <div className="p-6 space-y-8">

        {/* ── Tourist count by period ────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Туристов обслужено
            </h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {PERIOD_TABS.map((tab) => (
                <Link
                  key={tab.id}
                  href={`/admin/reports?period=${tab.id}`}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    period === tab.id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center gap-8">
            <div className="shrink-0">
              <p className="text-6xl font-bold text-gray-900 tabular-nums">
                {totalTourists.toLocaleString("ru")}
              </p>
              <p className="text-sm text-gray-500 mt-1">человек</p>
            </div>
            <div className="border-l border-gray-100 pl-8">
              <p className="text-sm text-gray-700 font-medium mb-1">
                Сумма всех туристов {periodLabel}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Считается по полю «кол-во человек» в каждой заявке — уже включает
                попутчиков, даже если у них нет номера в базе. Отменённые заявки
                не учитываются.
              </p>
            </div>
          </div>
        </div>

        {/* ── General stats ─────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Общая статистика
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            {/* By status */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">По статусам</h3>
              <div className="space-y-2">
                {byStatus.map((s) => (
                  <div key={s.status} className="flex justify-between text-sm">
                    <span className="text-gray-600">{STATUS_LABELS[s.status] ?? s.status}</span>
                    <span className="font-semibold text-gray-900">{s._count.id}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-semibold">
                  <span>Всего</span>
                  <span>{totalApps}</span>
                </div>
              </div>
            </div>

            {/* By source */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">По источникам</h3>
              <div className="space-y-2">
                {bySource.map((s) => (
                  <div key={s.utmSource ?? "direct"} className="flex justify-between text-sm">
                    <span className="text-gray-600">{s.utmSource ?? "Прямой"}</span>
                    <span className="font-semibold text-gray-900">{s._count.id}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top tours */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4">Топ туров</h3>
              <div className="space-y-2">
                {topTours.map((t, i) => (
                  <div key={t.tourId} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate">
                      {i + 1}. {tourMap[t.tourId] ?? "—"}
                    </span>
                    <span className="font-semibold text-gray-900 shrink-0 ml-2">
                      {t._count.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Manager KPI ───────────────────────────────────────────────── */}
        {canSeeManagers && (
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                KPI менеджеров — туристы
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Количество человек, записавшихся через каждого менеджера (статус «Предоплата» и выше)
              </p>
            </div>
            <ManagersReport />
          </div>
        )}

      </div>
    </>
  );
}
