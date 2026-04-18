import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER", "FINANCE"].includes(session.user.role)) {
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

  // Statuses that mean the tourist is confirmed (reached deposit or beyond)
  const CONFIRMED: ApplicationStatus[] = [
    ApplicationStatus.DEPOSIT,
    ApplicationStatus.NO_SHOW,
    ApplicationStatus.ON_TOUR,
    ApplicationStatus.FEEDBACK,
    ApplicationStatus.ARCHIVE,
  ];

  const departures = await prisma.departure.findMany({
    where: { departureDate: { gte: fromDate, lte: toDate } },
    orderBy: { departureDate: "asc" },
    include: {
      tour: { select: { id: true, title: true } },
      applications: {
        where: {
          status: { in: CONFIRMED },
          booking: { isNot: null },
        },
        include: {
          booking: { select: { finalPrice: true, currency: true } },
          manager: { select: { id: true, name: true } },
        },
      },
      groups: {
        include: {
          expenses: { select: { amount: true, currency: true } },
        },
      },
      extraExpenses: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Summary accumulator: managerId → totals
  const summaryMap: Record<
    string,
    { managerId: string; managerName: string; totalPersons: number; totalSalary: number }
  > = {};

  // First pass: calculate base profits for all departures
  const baseResults = departures.map((dep) => {
    const revenue = dep.applications.reduce(
      (sum, app) => sum + (app.booking?.finalPrice ?? 0),
      0
    );
    const tourExpenses = dep.groups
      .flatMap((g) => g.expenses)
      .reduce((sum, e) => sum + e.amount, 0);
    const extraExpensesTotal = dep.extraExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = revenue - tourExpenses - extraExpensesTotal;
    return { dep, revenue, tourExpenses, extraExpensesTotal, netProfit };
  });

  // Distribute negative profits equally across profitable departures
  const totalNegativeLoss = baseResults.reduce(
    (sum, r) => (r.netProfit < 0 ? sum + Math.abs(r.netProfit) : sum),
    0
  );
  const profitableCount = baseResults.filter((r) => r.netProfit > 0).length;
  const lossPerProfitableDep = profitableCount > 0 ? totalNegativeLoss / profitableCount : 0;

  // Second pass: build final results with adjusted profits
  const departureResults = baseResults.map(({ dep, revenue, tourExpenses, extraExpensesTotal, netProfit }) => {
    // Profitable departures absorb losses from negative ones equally
    const adjustedProfit = netProfit > 0
      ? Math.max(0, netProfit - lossPerProfitableDep)
      : 0;

    const totalPersons = dep.applications.reduce((sum, app) => sum + app.persons, 0);

    // Group by manager
    const managerMap: Record<string, { managerId: string; managerName: string; persons: number }> = {};
    for (const app of dep.applications) {
      if (!app.managerId || !app.manager) continue;
      if (!managerMap[app.managerId]) {
        managerMap[app.managerId] = {
          managerId: app.managerId,
          managerName: app.manager.name,
          persons: 0,
        };
      }
      managerMap[app.managerId].persons += app.persons;
    }

    const unassignedPersons = dep.applications
      .filter((a) => !a.managerId)
      .reduce((sum, a) => sum + a.persons, 0);

    const managerBreakdown = Object.values(managerMap).map((m) => {
      const profitShare =
        totalPersons > 0 && adjustedProfit > 0
          ? (adjustedProfit * m.persons) / totalPersons
          : 0;
      const salary = Math.round(profitShare * 0.04); // 4%

      if (!summaryMap[m.managerId]) {
        summaryMap[m.managerId] = {
          managerId: m.managerId,
          managerName: m.managerName,
          totalPersons: 0,
          totalSalary: 0,
        };
      }
      summaryMap[m.managerId].totalPersons += m.persons;
      summaryMap[m.managerId].totalSalary += salary;

      return {
        managerId: m.managerId,
        managerName: m.managerName,
        persons: m.persons,
        profitShare: Math.round(profitShare),
        salary,
      };
    });

    return {
      id: dep.id,
      tourId: dep.tour.id,
      tourTitle: dep.tour.title,
      departureDate: dep.departureDate.toISOString().split("T")[0],
      totalPersons,
      unassignedPersons,
      revenue,
      tourExpenses,
      extraExpenses: dep.extraExpenses.map((e) => ({
        id: e.id,
        amount: e.amount,
        currency: e.currency,
        description: e.description,
        createdAt: e.createdAt.toISOString(),
      })),
      totalExtraExpenses: extraExpensesTotal,
      netProfit,
      adjustedProfit,
      lossAdjustment: netProfit > 0 ? Math.round(lossPerProfitableDep) : 0,
      managerBreakdown: managerBreakdown.sort((a, b) => b.persons - a.persons),
    };
  });

  const summary = Object.values(summaryMap).sort(
    (a, b) => b.totalSalary - a.totalSalary
  );

  return NextResponse.json({
    departures: departureResults,
    summary,
    totals: {
      revenue: departureResults.reduce((s, d) => s + d.revenue, 0),
      expenses: departureResults.reduce(
        (s, d) => s + d.tourExpenses + d.totalExtraExpenses,
        0
      ),
      netProfit: departureResults.reduce((s, d) => s + d.netProfit, 0),
      totalSalary: summary.reduce((s, m) => s + m.totalSalary, 0),
    },
  });
}
