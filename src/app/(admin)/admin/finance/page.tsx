import Header from "@/components/admin/Header";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

type DepRow = {
  id: string;
  date: Date;
  status: string;
  tourTitle: string;
  totalPersons: number;
  deposits: number;
  revenue: number;
  expenses: number;
  profit: number;
  noShowCount: number;
  noShowLoss: number;
  shortfall: number;
  surplus: number;
  action: "TRANSFER" | "RECEIVE" | "BOTH" | "OK" | "NO_EXPENSES";
  currency: string;
};

export default async function FinancePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const departures = await prisma.departure.findMany({
    orderBy: { departureDate: "asc" },
    take: 80,
    include: {
      tour: { select: { id: true, title: true } },
      groups: {
        include: {
          expenses: { select: { amount: true, currency: true, category: true } },
          applications: {
            include: {
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

  // ── helpers ──────────────────────────────────────────────────────────────────

  type AppWithBooking = {
    persons: number;
    booking: {
      finalPrice: number;
      depositPaid: number;
      paymentStatus: string;
      currency: string;
      guidePaymentStatus: string;
    } | null;
  };

  // Revenue per booking:
  //   NO_SHOW  → only deposit (remainder was never collected)
  //   others   → full finalPrice (deposit + balance, whether collected yet or expected)
  const bookingRevenue = (a: AppWithBooking) => {
    if (!a.booking) return 0;
    return a.booking.guidePaymentStatus === "NO_SHOW"
      ? a.booking.depositPaid
      : a.booking.finalPrice;
  };

  // Guide-bound remainder: money the guide WILL collect (PENDING) or HAS collected (PAID).
  // Excludes NO_SHOW (won't pay) and TRANSFERRED (paid manager directly — not guide).
  const guideRemainder = (a: AppWithBooking) => {
    if (!a.booking) return 0;
    const gps = a.booking.guidePaymentStatus;
    if (gps === "NO_SHOW" || gps === "TRANSFERRED") return 0;
    return Math.max(0, a.booking.finalPrice - a.booking.depositPaid);
  };

  // ── per-departure calculation ─────────────────────────────────────────────

  const rows: DepRow[] = departures.map((dep) => {
    const allApps: AppWithBooking[] = [
      ...dep.groups.flatMap((g) => g.applications),
      ...dep.applications,
    ];
    const allExpenses = dep.groups.flatMap((g) => g.expenses);
    const expenses = allExpenses.reduce((s, e) => s + e.amount, 0);

    const deposits = allApps.reduce((s, a) => s + (a.booking?.depositPaid ?? 0), 0);
    const revenue = allApps.reduce((s, a) => s + bookingRevenue(a), 0);

    const noShowApps = allApps.filter((a) => a.booking?.guidePaymentStatus === "NO_SHOW");
    const noShowCount = noShowApps.length;
    const noShowLoss = noShowApps.reduce(
      (s, a) => s + Math.max(0, (a.booking?.finalPrice ?? 0) - (a.booking?.depositPaid ?? 0)),
      0
    );

    const profit = revenue - expenses;

    // Per-group shortfall / surplus — calculated using guide-bound apps only
    // (TRANSFERRED = paid manager, so guide doesn't have that money for expenses)
    let shortfall = 0;
    let surplus = 0;

    for (const group of dep.groups) {
      const grpExpenses = group.expenses.reduce((s, e) => s + e.amount, 0);
      if (grpExpenses === 0) continue;

      const grpRemainder = group.applications.reduce(
        (s, a) => s + guideRemainder(a),
        0
      );
      shortfall += Math.max(0, grpExpenses - grpRemainder);
      surplus += Math.max(0, grpRemainder - grpExpenses);
    }

    let action: DepRow["action"] = "NO_EXPENSES";
    if (expenses > 0) {
      if (shortfall > 0 && surplus > 0) action = "BOTH";
      else if (shortfall > 0) action = "TRANSFER";
      else if (surplus > 0) action = "RECEIVE";
      else action = "OK";
    }

    const currency =
      allApps.find((a) => a.booking?.currency)?.booking?.currency ?? "KGS";

    return {
      id: dep.id,
      date: dep.departureDate,
      status: dep.status,
      tourTitle: dep.tour.title,
      totalPersons: allApps.reduce((s, a) => s + a.persons, 0),
      deposits,
      revenue,
      expenses,
      profit,
      noShowCount,
      noShowLoss,
      shortfall,
      surplus,
      action,
      currency,
    };
  });

  // ── global KPIs ───────────────────────────────────────────────────────────

  const totalRevenue  = rows.reduce((s, r) => s + r.revenue, 0);
  const totalExpenses = rows.reduce((s, r) => s + r.expenses, 0);
  const totalProfit   = totalRevenue - totalExpenses;
  const totalDeposits = rows.reduce((s, r) => s + r.deposits, 0);
  const totalNoShowLoss = rows.reduce((s, r) => s + r.noShowLoss, 0);
  const totalToTransfer = rows.reduce((s, r) => s + r.shortfall, 0);
  const totalToReceive  = rows.reduce((s, r) => s + r.surplus, 0);

  // ── sections ──────────────────────────────────────────────────────────────

  const transferRows = rows.filter((r) => r.action === "TRANSFER" || r.action === "BOTH");
  const receiveRows  = rows.filter((r) => r.action === "RECEIVE");
  const okRows       = rows.filter((r) => r.action === "OK" || r.action === "NO_EXPENSES");

  const fmt = (n: number) => n.toLocaleString("ru");
  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <Header title="Финансы" />
      <div className="p-6 space-y-6">

        {/* ── Главные KPI ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
            Сводка по всем выездам
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Выручка */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1">Выручка (ожидаемая)</p>
              <p className="text-2xl font-bold text-blue-600">{fmt(totalRevenue)} сом</p>
              <p className="text-xs text-gray-400 mt-1">
                предоплаты + остатки активных туристов
              </p>
            </div>

            {/* Расходы */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-1">Расходы на туры</p>
              <p className="text-2xl font-bold text-gray-800">{fmt(totalExpenses)} сом</p>
              <p className="text-xs text-gray-400 mt-1">гид, транспорт, питание и др.</p>
            </div>

            {/* Чистая прибыль */}
            <div className={`rounded-xl border p-5 ${
              totalProfit >= 0
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            }`}>
              <p className="text-xs text-gray-500 mb-1">Чистая прибыль</p>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {totalProfit >= 0 ? "+" : ""}{fmt(totalProfit)} сом
              </p>
              <p className="text-xs text-gray-400 mt-1">выручка − расходы</p>
            </div>

            {/* Потери от не явившихся */}
            <div className={`rounded-xl border p-5 ${
              totalNoShowLoss > 0 ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"
            }`}>
              <p className="text-xs text-gray-500 mb-1">Потери (не явились)</p>
              <p className={`text-2xl font-bold ${totalNoShowLoss > 0 ? "text-orange-600" : "text-gray-400"}`}>
                {fmt(totalNoShowLoss)} сом
              </p>
              <p className="text-xs text-gray-400 mt-1">
                остатки которые не собрал гид
              </p>
            </div>
          </div>
        </div>

        {/* ── Второй ряд: Cash-flow ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Предоплаты получено</p>
            <p className="text-xl font-bold text-blue-600">{fmt(totalDeposits)} сом</p>
            <p className="text-xs text-gray-400 mt-1">{rows.length} выездов</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Остатки к сбору гидом</p>
            <p className="text-xl font-bold text-gray-700">
              {fmt(totalRevenue - totalDeposits)} сом
            </p>
            <p className="text-xs text-gray-400 mt-1">PENDING + PAID туристы</p>
          </div>
          <div className={`rounded-xl border p-4 ${totalToTransfer > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <p className="text-xs text-gray-500 mb-1">Перевести гидам</p>
            <p className={`text-xl font-bold ${totalToTransfer > 0 ? "text-red-600" : "text-gray-400"}`}>
              {fmt(totalToTransfer)} сом
            </p>
            <p className="text-xs text-gray-400 mt-1">{transferRows.length} выездов</p>
          </div>
          <div className={`rounded-xl border p-4 ${totalToReceive > 0 ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
            <p className="text-xs text-gray-500 mb-1">Получить от гидов</p>
            <p className={`text-xl font-bold ${totalToReceive > 0 ? "text-emerald-600" : "text-gray-400"}`}>
              {fmt(totalToReceive)} сом
            </p>
            <p className="text-xs text-gray-400 mt-1">{receiveRows.length} выездов</p>
          </div>
        </div>

        {/* ── Секция: Перевести гиду ────────────────────────────────────── */}
        {transferRows.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <h2 className="text-base font-semibold text-red-700">
                Перевести деньги гиду — {transferRows.length} выезд{transferRows.length !== 1 ? "а" : ""}
              </h2>
              <span className="ml-auto text-sm font-bold text-red-600">
                Итого: {fmt(totalToTransfer)} сом
              </span>
            </div>
            <p className="px-5 py-2 text-xs text-gray-500 border-b border-gray-100">
              Расходы на тур больше, чем остатки к сбору гидом — финансист переводит разницу
            </p>
            <div className="divide-y divide-gray-50">
              {transferRows.map((r) => (
                <DepartureRow key={r.id} row={r} fmt={fmt} fmtDate={fmtDate} />
              ))}
            </div>
          </div>
        )}

        {/* ── Секция: Получить от гида ──────────────────────────────────── */}
        {receiveRows.length > 0 && (
          <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <h2 className="text-base font-semibold text-emerald-700">
                Получить деньги от гида — {receiveRows.length} выезд{receiveRows.length !== 1 ? "а" : ""}
              </h2>
              <span className="ml-auto text-sm font-bold text-emerald-600">
                Итого: {fmt(totalToReceive)} сом
              </span>
            </div>
            <p className="px-5 py-2 text-xs text-gray-500 border-b border-gray-100">
              Гид собрал больше, чем потратил — остаток сдаёт в кассу
            </p>
            <div className="divide-y divide-gray-50">
              {receiveRows.map((r) => (
                <DepartureRow key={r.id} row={r} fmt={fmt} fmtDate={fmtDate} />
              ))}
            </div>
          </div>
        )}

        {/* ── Секция: Остальные ─────────────────────────────────────────── */}
        {okRows.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300 shrink-0" />
              <h2 className="text-base font-semibold text-gray-600">
                Остальные выезды — {okRows.length}
              </h2>
            </div>
            <div className="divide-y divide-gray-50">
              {okRows.map((r) => (
                <DepartureRow key={r.id} row={r} fmt={fmt} fmtDate={fmtDate} />
              ))}
            </div>
          </div>
        )}

        {rows.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            Нет выездов
          </div>
        )}
      </div>
    </>
  );
}

// ── Row component ──────────────────────────────────────────────────────────────

function DepartureRow({
  row,
  fmt,
  fmtDate,
}: {
  row: DepRow;
  fmt: (n: number) => string;
  fmtDate: (d: Date) => string;
}) {
  const isPast = new Date(row.date) < new Date();

  return (
    <div className="px-5 py-4 hover:bg-gray-50">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">

        {/* Tour info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/admin/departures/${row.id}`}
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              {row.tourTitle}
            </Link>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              row.status === "OPEN" ? "bg-blue-100 text-blue-600"
              : row.status === "CLOSED" ? "bg-gray-100 text-gray-500"
              : "bg-green-100 text-green-600"
            }`}>
              {row.status === "OPEN" ? "Открыт" : row.status === "CLOSED" ? "Закрыт" : row.status}
            </span>
            {isPast && row.status !== "CLOSED" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 shrink-0">
                Прошёл
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {fmtDate(row.date)} · {row.totalPersons} чел.
            {row.noShowCount > 0 && (
              <span className="ml-2 text-orange-500">
                · {row.noShowCount} не явился — потеря {fmt(row.noShowLoss)} сом
              </span>
            )}
          </p>
        </div>

        {/* Financial columns */}
        <div className="flex items-start gap-4 flex-wrap justify-end shrink-0">

          {/* Revenue */}
          <div className="text-right">
            <p className="text-xs text-gray-400">Выручка</p>
            <p className="text-sm font-semibold text-blue-700">{fmt(row.revenue)} сом</p>
          </div>

          {/* Expenses */}
          <div className="text-right">
            <p className="text-xs text-gray-400">Расходы</p>
            <p className="text-sm font-semibold text-gray-700">{row.expenses > 0 ? fmt(row.expenses) + " сом" : "—"}</p>
          </div>

          {/* Profit */}
          {row.expenses > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Прибыль</p>
              <p className={`text-sm font-bold ${row.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {row.profit >= 0 ? "+" : ""}{fmt(row.profit)} сом
              </p>
            </div>
          )}

          {/* Action badge(s) */}
          {(row.action === "TRANSFER" || row.action === "BOTH") && (
            <div className="bg-red-100 border border-red-200 rounded-lg px-3 py-1.5 text-center min-w-[110px]">
              <p className="text-xs text-red-500 font-medium">Перевести гиду</p>
              <p className="text-sm font-bold text-red-700">{fmt(row.shortfall)} сом</p>
            </div>
          )}
          {(row.action === "RECEIVE" || row.action === "BOTH") && (
            <div className="bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-1.5 text-center min-w-[110px]">
              <p className="text-xs text-emerald-600 font-medium">Получить от гида</p>
              <p className="text-sm font-bold text-emerald-700">{fmt(row.surplus)} сом</p>
            </div>
          )}
          {row.action === "OK" && (
            <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 text-center min-w-[110px]">
              <p className="text-xs text-gray-500 font-medium">Баланс в порядке</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
