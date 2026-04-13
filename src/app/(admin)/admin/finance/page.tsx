import Header from "@/components/admin/Header";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const GUIDE_STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает",
  PAID: "Оплатил",
  TRANSFERRED: "Перевел",
  NO_SHOW: "Не явился",
};

export default async function FinancePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Fetch all departures with financial data
  const departures = await prisma.departure.findMany({
    orderBy: { departureDate: "desc" },
    take: 60,
    include: {
      tour: { select: { id: true, title: true } },
      groups: {
        include: {
          expenses: { select: { id: true, category: true, amount: true, currency: true, note: true } },
          applications: {
            include: {
              client: { select: { name: true } },
              booking: {
                select: {
                  finalPrice: true,
                  depositPaid: true,
                  paymentStatus: true,
                  currency: true,
                  guidePaymentStatus: true,
                },
              },
            },
          },
        },
      },
      applications: {
        where: { groupId: null },
        include: {
          client: { select: { name: true } },
          booking: {
            select: {
              finalPrice: true,
              depositPaid: true,
              paymentStatus: true,
              currency: true,
              guidePaymentStatus: true,
            },
          },
        },
      },
    },
  });

  // Global KPIs
  let globalDeposits = 0;
  let globalBalances = 0;
  let globalExpenses = 0;
  let globalCollected = 0;

  const depData = departures.map((dep) => {
    const allApps = [
      ...dep.groups.flatMap((g) => g.applications),
      ...dep.applications,
    ];
    const allExpenses = dep.groups.flatMap((g) => g.expenses);

    const deposits = allApps.reduce((s, a) => s + (a.booking?.depositPaid ?? 0), 0);
    const revenue = allApps.reduce((s, a) => s + (a.booking?.finalPrice ?? 0), 0);
    const balance = revenue - deposits;
    const expenses = allExpenses.reduce((s, e) => s + e.amount, 0);

    // Guide collected: apps where guidePaymentStatus = PAID
    const collected = allApps
      .filter((a) => a.booking?.guidePaymentStatus === "PAID")
      .reduce((s, a) => s + Math.max(0, (a.booking?.finalPrice ?? 0) - (a.booking?.depositPaid ?? 0)), 0);

    globalDeposits += deposits;
    globalBalances += balance;
    globalExpenses += expenses;
    globalCollected += collected;

    const net = deposits + collected - expenses;
    const currency = allApps.find((a) => a.booking?.currency)?.booking?.currency ?? "KGS";

    return {
      id: dep.id,
      date: dep.departureDate,
      tour: dep.tour,
      status: dep.status,
      totalPersons: allApps.reduce((s, a) => s + a.persons, 0),
      deposits,
      revenue,
      balance,
      collected,
      expenses,
      net,
      currency,
      groupCount: dep.groups.length,
      apps: allApps.map((a) => ({
        id: a.id,
        clientName: a.client.name,
        finalPrice: a.booking?.finalPrice ?? 0,
        depositPaid: a.booking?.depositPaid ?? 0,
        paymentStatus: a.booking?.paymentStatus ?? "PENDING",
        guidePaymentStatus: a.booking?.guidePaymentStatus ?? "PENDING",
        currency: a.booking?.currency ?? "KGS",
      })),
    };
  });

  const globalNet = globalDeposits + globalCollected - globalExpenses;

  return (
    <>
      <Header title="Финансы" />
      <div className="p-6 space-y-6">

        {/* Global KPIs */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Предоплат получено</p>
            <p className="text-2xl font-bold text-blue-600">{globalDeposits.toLocaleString("ru")} сом</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Остатки (к сбору)</p>
            <p className="text-2xl font-bold text-orange-600">{globalBalances.toLocaleString("ru")} сом</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Расходы</p>
            <p className="text-2xl font-bold text-red-600">{globalExpenses.toLocaleString("ru")} сом</p>
          </div>
          <div className={`rounded-xl border p-5 ${globalNet >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <p className="text-xs text-gray-500 mb-1">Чистые (предоплаты + собрано − расходы)</p>
            <p className={`text-2xl font-bold ${globalNet >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {globalNet >= 0 ? "+" : ""}{globalNet.toLocaleString("ru")} сом
            </p>
          </div>
        </div>

        {/* Per-departure table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">По выездам</h2>
            <span className="text-xs text-gray-400">{depData.length} выездов</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Выезд</th>
                  <th className="px-4 py-3 text-center">Туристов</th>
                  <th className="px-4 py-3 text-right">Предоплата</th>
                  <th className="px-4 py-3 text-right">Остаток</th>
                  <th className="px-4 py-3 text-right">Собрал гид</th>
                  <th className="px-4 py-3 text-right">Расходы</th>
                  <th className="px-4 py-3 text-right">Итого</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {depData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Нет выездов</td>
                  </tr>
                ) : depData.map((dep) => {
                  const netColor = dep.net >= 0 ? "text-emerald-600" : "text-red-600";
                  return (
                    <tr key={dep.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/departures/${dep.id}`} className="font-medium text-blue-600 hover:underline text-sm">
                          {dep.tour.title}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(dep.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })}
                          {dep.groupCount > 0 && ` · ${dep.groupCount} авт.`}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{dep.totalPersons}</td>
                      <td className="px-4 py-3 text-right text-blue-700 font-medium">
                        {dep.deposits > 0 ? `${dep.deposits.toLocaleString("ru")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600">
                        {dep.balance > 0 ? `${dep.balance.toLocaleString("ru")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium">
                        {dep.collected > 0 ? `${dep.collected.toLocaleString("ru")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {dep.expenses > 0 ? `${dep.expenses.toLocaleString("ru")}` : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${netColor}`}>
                        {dep.net >= 0 ? "+" : ""}{dep.net.toLocaleString("ru")} {dep.currency}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Per-departure detailed accordion */}
        <div className="space-y-4">
          {depData.map((dep) => (
            <div key={dep.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <Link href={`/admin/departures/${dep.id}`} className="font-semibold text-gray-800 hover:text-blue-600">
                    {dep.tour.title}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(dep.date).toLocaleDateString("ru-RU", {
                      weekday: "short", day: "numeric", month: "long", year: "numeric",
                    })}
                    {dep.groupCount > 0 && ` · ${dep.groupCount} автобусов`}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs text-gray-400">Предоплата</p>
                    <p className="text-sm font-semibold text-blue-600">{dep.deposits.toLocaleString("ru")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Расходы</p>
                    <p className="text-sm font-semibold text-red-600">{dep.expenses.toLocaleString("ru")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Итог</p>
                    <p className={`text-sm font-bold ${dep.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {dep.net >= 0 ? "+" : ""}{dep.net.toLocaleString("ru")} {dep.currency}
                    </p>
                  </div>
                </div>
              </div>

              {dep.apps.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-400 uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left">Клиент</th>
                        <th className="px-4 py-2 text-right">Цена</th>
                        <th className="px-4 py-2 text-right">Предоплата</th>
                        <th className="px-4 py-2 text-right">Остаток</th>
                        <th className="px-4 py-2 text-center">Гид</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {dep.apps.map((a) => {
                        const bal = Math.max(0, a.finalPrice - a.depositPaid);
                        const gpsLabel = GUIDE_STATUS_LABELS[a.guidePaymentStatus] ?? a.guidePaymentStatus;
                        const gpsColor =
                          a.guidePaymentStatus === "PAID" ? "text-green-600" :
                          a.guidePaymentStatus === "NO_SHOW" ? "text-red-500" :
                          a.guidePaymentStatus === "TRANSFERRED" ? "text-blue-600" :
                          "text-gray-400";
                        return (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium text-gray-800">{a.clientName}</td>
                            <td className="px-4 py-2 text-right text-gray-600">{a.finalPrice.toLocaleString("ru")}</td>
                            <td className="px-4 py-2 text-right text-blue-600">{a.depositPaid > 0 ? a.depositPaid.toLocaleString("ru") : "—"}</td>
                            <td className="px-4 py-2 text-right text-orange-600">{bal > 0 ? bal.toLocaleString("ru") : "—"}</td>
                            <td className={`px-4 py-2 text-center font-medium ${gpsColor}`}>{gpsLabel}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
