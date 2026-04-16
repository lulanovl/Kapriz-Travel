import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/extra-expenses/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER", "FINANCE"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const expense = await prisma.extraExpense.findUnique({
    where: { id: params.id },
  });
  if (!expense) {
    return NextResponse.json({ error: "Расход не найден" }, { status: 404 });
  }

  await prisma.extraExpense.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
