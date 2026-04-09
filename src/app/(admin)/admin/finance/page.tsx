import Header from "@/components/admin/Header";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExportButton from "@/components/admin/finance/ExportButton";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  GUIDE: "Гид",
  DRIVER: "Водитель",
  TRANSPORT: "Транспорт",
  ACCOMMODATION: "Проживание",
  FOOD: "Питание",
  OTHER: "Прочее",
};

const CATEGORY_COLORS: Record<string, string> = {
  GUIDE: "bg-purple-100 text-purple-700",
  DRIVER: "bg-green-100 text-green-700",
  TRANSPORT: "bg-blue-100 text-blue-700",
  ACCOMMODATION: "bg-orange-100 text-orange-700",
  FOOD: "bg-yellow-100 text-yellow-700",
  OTHER: "bg-gray-100 text-gray-600",
};

export default async function FinancePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [bookings, expensesByCategory, recentExpenses] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        application: {
          include: {
            client: { select: { name: true } },
            tour: { select: { title: true } },
            tourDate: { select: { startDate: true } },
          },
        },
      },
    }),
    prisma.expense.groupBy({
      by: ["category", "currency"],
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        tourDate: {
          include: { tour: { select: { title: true } } },
        },
      },
    }),
  ]);

  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === "PAID")
    .reduce((sum, b) => sum + b.finalPrice, 0);

  const totalDeposits = bookings.reduce((sum, b) => sum + b.depositPaid, 0);

  const pendingBalance = bookings
    .filter((b) => b.paymentStatus !== "PAID")
    .reduce((sum, b) => sum + (b.finalPrice - b.depositPaid), 0);

  const totalExpensesKGS = expensesByCategory
    .filter((e) => e.currency === "KGS")
    .reduce((sum, e) => sum + (e._sum.amount ?? 0), 0);

  const netIncome = totalDeposits - totalExpensesKGS;

  return (
    <>
      <Header title="Финансы" />
      <div className="p-6 space-y-6">

        {/* Top bar with export */}
        <div className="flex justify-end">
          <ExportButton />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Оплачено полностью</p>
            <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString("ru")} сом</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Предоплат получено</p>
            <p className="text-2xl font-bold text-blue-600">{totalDeposits.toLocaleString("ru")} сом</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Расходы (KGS)</p>
            <p className="text-2xl font-bold text-orange-600">{totalExpensesKGS.toLocaleString("ru")} сом</p>
          </div>
          <div className={`rounded-xl border p-5 ${netIncome >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
            <p className="text-xs text-gray-500 mb-1">Чистые доходы</p>
            <p className={`text-2xl font-bold ${netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {netIncome >= 0 ? "+" : ""}{netIncome.toLocaleString("ru")} сом
            </p>
            <p className="text-xs text-gray-400 mt-0.5">предоплаты − расходы</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Expenses by category */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Расходы по категориям</h2>
            </div>
            {expensesByCategory.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Нет расходов</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {expensesByCategory.map((e) => (
                  <div key={`${e.category}-${e.currency}`} className="px-5 py-3 flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${CATEGORY_COLORS[e.category] ?? "bg-gray-100 text-gray-600"}`}>
                      {CATEGORY_LABELS[e.category] ?? e.category}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">
                      {(e._sum.amount ?? 0).toLocaleString("ru")} {e.currency}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent expenses */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Последние расходы</h2>
            </div>
            {recentExpenses.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Нет расходов</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Тур / Дата</th>
                      <th className="px-4 py-3 text-left">Категория</th>
                      <th className="px-4 py-3 text-right">Сумма</th>
                      <th className="px-4 py-3 text-left">Примечание</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentExpenses.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-900 truncate max-w-[180px]">{e.tourDate.tour.title}</p>
                          <p className="text-xs text-gray-400">
                            {new Date(e.tourDate.startDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${CATEGORY_COLORS[e.category] ?? "bg-gray-100 text-gray-600"}`}>
                            {CATEGORY_LABELS[e.category] ?? e.category}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-800">
                          {e.amount.toLocaleString("ru")} {e.currency}
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs truncate max-w-[140px]">
                          {e.note ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Bookings table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Все бронирования</h2>
            <span className="text-xs text-gray-400">{bookings.length} записей</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Клиент</th>
                  <th className="px-4 py-3 text-left">Тур</th>
                  <th className="px-4 py-3 text-left">Дата тура</th>
                  <th className="px-4 py-3 text-right">Цена</th>
                  <th className="px-4 py-3 text-right">Предоплата</th>
                  <th className="px-4 py-3 text-right">Остаток</th>
                  <th className="px-4 py-3 text-center">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Нет бронирований
                    </td>
                  </tr>
                ) : bookings.map((b) => {
                  const balance = b.finalPrice - b.depositPaid;
                  const statusColor =
                    b.paymentStatus === "PAID"
                      ? "bg-green-100 text-green-700"
                      : b.paymentStatus === "PARTIAL"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-500";
                  const statusLabel =
                    b.paymentStatus === "PAID" ? "Оплачено" :
                    b.paymentStatus === "PARTIAL" ? "Частично" : "Ожидает";

                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {b.application.client.name}
                      </td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[180px]">
                        {b.application.tour.title}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {b.application.tourDate
                          ? new Date(b.application.tourDate.startDate).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {b.finalPrice.toLocaleString("ru")} {b.currency}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600">
                        {b.depositPaid > 0 ? `${b.depositPaid.toLocaleString("ru")} ${b.currency}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600">
                        {balance > 0 ? `${balance.toLocaleString("ru")} ${b.currency}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending balance callout */}
        {pendingBalance > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">К получению от клиентов:</span>{" "}
              {pendingBalance.toLocaleString("ru")} сом
              <span className="text-amber-600 ml-2 text-xs">(остатки по незакрытым бронированиям)</span>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
