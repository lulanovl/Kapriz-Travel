import Header from "@/components/admin/Header";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!["ADMIN", "SENIOR_MANAGER", "FINANCE"].includes(session.user.role)) {
    redirect("/admin");
  }

  const [totalApps, byStatus, bySource, topTours] = await Promise.all([
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
  ]);

  const tourIds = topTours.map((t) => t.tourId);
  const tours = await prisma.tour.findMany({
    where: { id: { in: tourIds } },
    select: { id: true, title: true },
  });
  const tourMap = Object.fromEntries(tours.map((t) => [t.id, t.title]));

  const STATUS_LABELS: Record<string, string> = {
    NEW: "Новая", CONTACT: "Контакт", PROPOSAL: "КП", DEPOSIT: "Предоплата",
    NO_SHOW: "Не явился", ON_TOUR: "В туре", FEEDBACK: "Отзыв", ARCHIVE: "Архив",
  };

  return (
    <>
      <Header title="Отчёты" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-3 gap-6">
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
                  <span className="font-semibold text-gray-900 shrink-0 ml-2">{t._count.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
