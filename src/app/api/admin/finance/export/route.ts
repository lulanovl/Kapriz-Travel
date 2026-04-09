import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER", "FINANCE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [bookings, expenses] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        application: {
          include: {
            client: { select: { name: true, whatsapp: true } },
            tour: { select: { title: true } },
            tourDate: { select: { startDate: true, endDate: true } },
          },
        },
      },
    }),
    prisma.expense.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        tourDate: {
          include: {
            tour: { select: { title: true } },
          },
        },
      },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  // Sheet 1: Bookings
  const bookingRows = bookings.map((b) => ({
    Клиент: b.application.client.name,
    WhatsApp: b.application.client.whatsapp,
    Тур: b.application.tour.title,
    "Дата начала": b.application.tourDate
      ? new Date(b.application.tourDate.startDate).toLocaleDateString("ru-RU")
      : "",
    "Базовая цена": b.basePrice,
    "Итоговая цена": b.finalPrice,
    Валюта: b.currency,
    Предоплата: b.depositPaid,
    Остаток: b.finalPrice - b.depositPaid,
    "Статус оплаты":
      b.paymentStatus === "PAID"
        ? "Оплачено"
        : b.paymentStatus === "PARTIAL"
        ? "Частично"
        : "Ожидает",
    "Дата создания": new Date(b.createdAt).toLocaleDateString("ru-RU"),
  }));
  const ws1 = XLSX.utils.json_to_sheet(bookingRows);
  XLSX.utils.book_append_sheet(wb, ws1, "Бронирования");

  // Sheet 2: Expenses
  const CATEGORY_LABELS: Record<string, string> = {
    GUIDE: "Гид",
    DRIVER: "Водитель",
    TRANSPORT: "Транспорт",
    ACCOMMODATION: "Проживание",
    FOOD: "Питание",
    OTHER: "Прочее",
  };
  const expenseRows = expenses.map((e) => ({
    Тур: e.tourDate.tour.title,
    "Дата начала": new Date(e.tourDate.startDate).toLocaleDateString("ru-RU"),
    Категория: CATEGORY_LABELS[e.category] ?? e.category,
    Сумма: e.amount,
    Валюта: e.currency,
    Примечание: e.note ?? "",
    "Дата добавления": new Date(e.createdAt).toLocaleDateString("ru-RU"),
  }));
  const ws2 = XLSX.utils.json_to_sheet(expenseRows.length > 0 ? expenseRows : [{ Тур: "Нет данных" }]);
  XLSX.utils.book_append_sheet(wb, ws2, "Расходы");

  // Sheet 3: Summary
  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === "PAID")
    .reduce((s, b) => s + b.finalPrice, 0);
  const totalDeposits = bookings.reduce((s, b) => s + b.depositPaid, 0);
  const totalExpensesKGS = expenses
    .filter((e) => e.currency === "KGS")
    .reduce((s, e) => s + e.amount, 0);

  const summaryRows = [
    { Показатель: "Оплачено полностью (сом)", Значение: totalRevenue },
    { Показатель: "Предоплат получено (сом)", Значение: totalDeposits },
    { Показатель: "Расходы (сом, только KGS)", Значение: totalExpensesKGS },
    { Показатель: "Чистые доходы (предоплаты − расходы, KGS)", Значение: totalDeposits - totalExpensesKGS },
  ];
  const ws3 = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws3, "Итоги");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const date = new Date().toISOString().split("T")[0];

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="finance-${date}.xlsx"`,
    },
  });
}
