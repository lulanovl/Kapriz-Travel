import Header from "@/components/admin/Header";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  type DepRow = {
    id: string;
    date: Date;
    status: string;
    tourId: string;
    tourTitle: string;
    totalPersons: number;
    deposits: number;     // сумма предоплат (уже у компании)
    remainder: number;    // остатки к сбору гидом (noshow исключены)
    expenses: number;     // расходы по туру
    shortfall: number;    // нехватка → финансист переводит гиду (expenses - remainder)
    surplus: number;      // излишек → гид возвращает финансисту (remainder - expenses)
    action: "TRANSFER" | "RECEIVE" | "OK" | "NO_EXPENSES";
    currency: string;
    noShowCount: number;
    noShowDeposits: number;
  };

  const rows: DepRow[] = departures.map((dep) => {
    const allApps = [
      ...dep.groups.flatMap((g) => g.applications),
      ...dep.applications,
    ];
    const allExpenses = dep.groups.flatMap((g) => g.expenses);

    const expenses = allExpenses.reduce((s, e) => s + e.amount, 0);

    // Не явились — их остатки не идут гиду
    const noShowApps = allApps.filter(
      (a) => a.booking?.guidePaymentStatus === "NO_SHOW"
    );
    const activeApps = allApps.filter(
      (a) => a.booking?.guidePaymentStatus !== "NO_SHOW"
    );

    const deposits = allApps.reduce(
      (s, a) => s + (a.booking?.depositPaid ?? 0),
      0
    );
    const remainder = activeApps.reduce(
      (s, a) =>
        s + Math.max(0, (a.booking?.finalPrice ?? 0) - (a.booking?.depositPaid ?? 0)),
      0
    );
    const noShowDeposits = noShowApps.reduce(
      (s, a) => s + (a.booking?.depositPaid ?? 0),
      0
    );

    const shortfall = expenses > 0 ? Math.max(0, expenses - remainder) : 0;
    const surplus = expenses > 0 ? Math.max(0, remainder - expenses) : 0;

    let action: DepRow["action"] = "NO_EXPENSES";
    if (expenses > 0) {
      if (shortfall > 0) action = "TRANSFER";
      else if (surplus > 0) action = "RECEIVE";
      else action = "OK";
    }

    const currency =
      allApps.find((a) => a.booking?.currency)?.booking?.currency ?? "KGS";

    return {
      id: dep.id,
      date: dep.departureDate,
      status: dep.status,
      tourId: dep.tour.id,
      tourTitle: dep.tour.title,
      totalPersons: allApps.reduce((s, a) => s + a.persons, 0),
      deposits,
      remainder,
      expenses,
      shortfall,
      surplus,
      action,
      currency,
      noShowCount: noShowApps.length,
      noShowDeposits,
    };
  });

  // Split into sections
  const transferRows = rows.filter((r) => r.action === "TRANSFER");
  const receiveRows = rows.filter((r) => r.action === "RECEIVE");
  const okRows = rows.filter((r) => r.action === "OK" || r.action === "NO_EXPENSES");

  const totalToTransfer = transferRows.reduce((s, r) => s + r.shortfall, 0);
  const totalToReceive = receiveRows.reduce((s, r) => s + r.surplus, 0);
  const totalDeposits = rows.reduce((s, r) => s + r.deposits, 0);
  const totalExpenses = rows.reduce((s, r) => s + r.expenses, 0);

  const fmt = (n: number) => n.toLocaleString("ru");
  const fmtDate = (d: Date) =>
    new Date(d).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <>
      <Header title="Финансы" />
      <div className="p-6 space-y-6">

        {/* Global KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Предоплат получено</p>
            <p className="text-2xl font-bold text-blue-600">{fmt(totalDeposits)} сом</p>
            <p className="text-xs text-gray-400 mt-1">{rows.length} выездов</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">Расходы по турам</p>
            <p className="text-2xl font-bold text-gray-800">{fmt(totalExpenses)} сом</p>
            <p className="text-xs text-gray-400 mt-1">по всем выездам</p>
          </div>
          <div className={`rounded-xl border p-5 ${totalToTransfer > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <p className="text-xs text-gray-500 mb-1">Перевести гидам</p>
            <p className={`text-2xl font-bold ${totalToTransfer > 0 ? "text-red-600" : "text-gray-400"}`}>
              {fmt(totalToTransfer)} сом
            </p>
            <p className="text-xs text-gray-400 mt-1">{transferRows.length} выездов</p>
          </div>
          <div className={`rounded-xl border p-5 ${totalToReceive > 0 ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
            <p className="text-xs text-gray-500 mb-1">Получить от гидов</p>
            <p className={`text-2xl font-bold ${totalToReceive > 0 ? "text-emerald-600" : "text-gray-400"}`}>
              {fmt(totalToReceive)} сом
            </p>
            <p className="text-xs text-gray-400 mt-1">{receiveRows.length} выездов</p>
          </div>
        </div>

        {/* Section: Transfer to guide */}
        {transferRows.length > 0 && (
          <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <h2 className="text-base font-semibold text-red-700">
                Перевести деньги гиду — {transferRows.length} выезд{transferRows.length > 1 ? "а" : ""}
              </h2>
              <span className="ml-auto text-sm font-bold text-red-600">
                Итого: {fmt(totalToTransfer)} сом
              </span>
            </div>
            <p className="px-5 py-2 text-xs text-gray-500 border-b border-gray-100">
              Расходы на тур больше, чем остатки к сбору — финансист должен перевести разницу гиду
            </p>
            <div className="divide-y divide-gray-50">
              {transferRows.map((r) => (
                <DepartureRow key={r.id} row={r} fmt={fmt} fmtDate={fmtDate} />
              ))}
            </div>
          </div>
        )}

        {/* Section: Receive from guide */}
        {receiveRows.length > 0 && (
          <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-emerald-100 bg-emerald-50 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <h2 className="text-base font-semibold text-emerald-700">
                Получить деньги от гида — {receiveRows.length} выезд{receiveRows.length > 1 ? "а" : ""}
              </h2>
              <span className="ml-auto text-sm font-bold text-emerald-600">
                Итого: {fmt(totalToReceive)} сом
              </span>
            </div>
            <p className="px-5 py-2 text-xs text-gray-500 border-b border-gray-100">
              Гид собрал больше, чем потратил — остаток нужно получить в кассу
            </p>
            <div className="divide-y divide-gray-50">
              {receiveRows.map((r) => (
                <DepartureRow key={r.id} row={r} fmt={fmt} fmtDate={fmtDate} />
              ))}
            </div>
          </div>
        )}

        {/* Section: OK / no expenses */}
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

type DepRow = {
  id: string;
  date: Date;
  status: string;
  tourId: string;
  tourTitle: string;
  totalPersons: number;
  deposits: number;
  remainder: number;
  expenses: number;
  shortfall: number;
  surplus: number;
  action: "TRANSFER" | "RECEIVE" | "OK" | "NO_EXPENSES";
  currency: string;
  noShowCount: number;
  noShowDeposits: number;
};

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
    <div className="px-5 py-4 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center gap-3">
      {/* Tour info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/admin/departures/${row.id}`}
            className="text-sm font-semibold text-blue-700 hover:underline truncate"
          >
            {row.tourTitle}
          </Link>
          <span
            className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
              row.status === "OPEN"
                ? "bg-blue-100 text-blue-600"
                : row.status === "CLOSED"
                ? "bg-gray-100 text-gray-500"
                : "bg-green-100 text-green-600"
            }`}
          >
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
            <span className="ml-2 text-red-400">
              · {row.noShowCount} не явились ({fmt(row.noShowDeposits)} сом удержано)
            </span>
          )}
        </p>
      </div>

      {/* Financial numbers */}
      <div className="flex items-center gap-5 text-right shrink-0 flex-wrap justify-end">
        <div>
          <p className="text-xs text-gray-400">Предоплата</p>
          <p className="text-sm font-medium text-blue-600">{fmt(row.deposits)} сом</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Остаток гиду</p>
          <p className="text-sm font-medium text-gray-700">{fmt(row.remainder)} сом</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Расходы</p>
          <p className="text-sm font-medium text-gray-700">{fmt(row.expenses)} сом</p>
        </div>

        {/* Action badge */}
        {row.action === "TRANSFER" && (
          <div className="bg-red-100 border border-red-200 rounded-lg px-3 py-2 text-center min-w-[120px]">
            <p className="text-xs text-red-500 font-medium">Перевести гиду</p>
            <p className="text-base font-bold text-red-700">{fmt(row.shortfall)} сом</p>
          </div>
        )}
        {row.action === "RECEIVE" && (
          <div className="bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-2 text-center min-w-[120px]">
            <p className="text-xs text-emerald-600 font-medium">Получить от гида</p>
            <p className="text-base font-bold text-emerald-700">{fmt(row.surplus)} сом</p>
          </div>
        )}
        {row.action === "OK" && (
          <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-center min-w-[120px]">
            <p className="text-xs text-gray-500 font-medium">Баланс</p>
            <p className="text-sm font-bold text-gray-600">В порядке</p>
          </div>
        )}
        {row.action === "NO_EXPENSES" && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center min-w-[120px]">
            <p className="text-xs text-gray-400">Нет расходов</p>
          </div>
        )}
      </div>
    </div>
  );
}
