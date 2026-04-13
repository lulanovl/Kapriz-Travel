import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expenses = await prisma.expense.findMany({
    where: { groupId: params.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER", "FINANCE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { category, amount, currency, note } = await req.json();
  if (!category || !amount) {
    return NextResponse.json({ error: "category and amount required" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      groupId: params.id,
      category,
      amount: Number(amount),
      currency: currency ?? "KGS",
      note: note ?? null,
    },
  });
  return NextResponse.json(expense);
}
