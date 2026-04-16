import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json({ error: "Missing from/to params" }, { status: 400 });
  }

  const fromDate = new Date(from);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  // All managers and senior managers
  const managers = await prisma.user.findMany({
    where: { role: { in: ["MANAGER", "SENIOR_MANAGER"] } },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  // Applications that reached DEPOSIT or beyond — "записался" = confirmed booking
  // Using createdAt as the date anchor (when the application entered the system)
  const applications = await prisma.application.findMany({
    where: {
      managerId: { not: null },
      status: { in: ["DEPOSIT", "NO_SHOW", "ON_TOUR", "FEEDBACK", "ARCHIVE"] },
      createdAt: { gte: fromDate, lte: toDate },
    },
    select: {
      managerId: true,
      persons: true,
      createdAt: true,
      status: true,
    },
  });

  const result = managers.map((m) => {
    const items = applications
      .filter((a) => a.managerId === m.id)
      .map((a) => ({
        date: a.createdAt.toISOString().split("T")[0], // YYYY-MM-DD
        persons: a.persons,
        status: a.status,
      }));

    return {
      id: m.id,
      name: m.name,
      role: m.role,
      items,
      totalPersons: items.reduce((s, i) => s + i.persons, 0),
      totalApplications: items.length,
    };
  });

  // Only return managers who have at least some applications OR are active (include all)
  return NextResponse.json({ managers: result });
}
