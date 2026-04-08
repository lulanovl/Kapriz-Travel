import Header from "@/components/admin/Header";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      application: {
        include: {
          client: { select: { name: true } },
          tour: { select: { title: true } },
        },
      },
    },
  });

  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === "PAID")
    .reduce((sum, b) => sum + b.finalPrice, 0);

  const totalDeposits = bookings.reduce((sum, b) => sum + b.depositPaid, 0);

  const pendingBalance = bookings
    .filter((b) => b.paymentStatus !== "PAID")
    .reduce((sum, b) => sum + (b.finalPrice - b.depositPaid), 0);

  return (
    <>
      <Header title="Финансы" />
      <div className="p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Оплачено (полностью)</p>
            <p className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString("ru")} сом</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Предоплат получено</p>
            <p className="text-2xl font-bold text-blue-600">{totalDeposits.toLocaleString("ru")} сом</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Остаток к оплате</p>
            <p className="text-2xl font-bold text-orange-600">{pendingBalance.toLocaleString("ru")} сом</p>
          </div>
        </div>

        {/* Bookings table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Все бронирования</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Клиент</th>
                  <th className="px-4 py-3 text-left">Тур</th>
                  <th className="px-4 py-3 text-right">Цена</th>
                  <th className="px-4 py-3 text-right">Предоплата</th>
                  <th className="px-4 py-3 text-right">Остаток</th>
                  <th className="px-4 py-3 text-center">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => {
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
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">
                        {b.application.tour.title}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {b.finalPrice.toLocaleString("ru")} {b.currency}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600">
                        {b.depositPaid.toLocaleString("ru")} {b.currency}
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
      </div>
    </>
  );
}
