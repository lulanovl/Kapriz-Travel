import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/extra-expenses
// Body: { departureId, amount, currency, description }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER", "FINANCE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { departureId, amount, currency = "KGS", description = "" } = body;

  if (!departureId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json(
      { error: "departureId и сумма обязательны" },
      { status: 400 }
    );
  }

  // Verify the departure exists
  const departure = await prisma.departure.findUnique({
    where: { id: departureId },
    select: { id: true },
  });
  if (!departure) {
    return NextResponse.json({ error: "Выезд не найден" }, { status: 404 });
  }

  const expense = await prisma.extraExpense.create({
    data: {
      departureId,
      amount: Math.round(Number(amount)),
      currency,
      description: String(description).trim(),
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
