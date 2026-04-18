/**
 * Tests: GET /api/admin/salary
 *
 * Covers:
 *  - Auth / role guards
 *  - Missing query params
 *  - Basic profit & salary calculation (4% of proportional share)
 *  - Loss distribution: negative tours deduct from profitable ones equally
 *  - NO_SHOW: bookings count depositPaid (not finalPrice) as revenue
 *  - NO_SHOW-driven losses distributed to profitable tours in same period
 *  - Edge cases: all tours negative, single tour, no departures
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/admin/salary/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest } from "../../../helpers/request";

const BASE_URL = "/api/admin/salary?from=2026-06-01&to=2026-06-30";

// ─── Fixture builders ──────────────────────────────────────────────────────

function makeApp(overrides: {
  id?: string;
  persons?: number;
  managerId?: string | null;
  managerName?: string;
  finalPrice?: number;
  depositPaid?: number;
  status?: string;
} = {}) {
  const {
    id = "app-1",
    persons = 2,
    managerId = "mgr-a",
    managerName = "Менеджер А",
    finalPrice = 10000,
    depositPaid = 0,
    status = "DEPOSIT",
  } = overrides;

  return {
    id,
    persons,
    status,
    managerId,
    manager: managerId ? { id: managerId, name: managerName } : null,
    booking: { finalPrice, depositPaid, currency: "KGS" },
  };
}

function makeDeparture(overrides: {
  id?: string;
  title?: string;
  date?: string;
  applications?: ReturnType<typeof makeApp>[];
  groupExpenses?: number[];
  extraExpenses?: number[];
} = {}) {
  const {
    id = "dep-1",
    title = "Иссык-Куль",
    date = "2026-06-15",
    applications = [makeApp()],
    groupExpenses = [],
    extraExpenses = [],
  } = overrides;

  return {
    id,
    departureDate: new Date(date),
    tour: { id: `tour-${id}`, title },
    applications,
    groups: groupExpenses.length
      ? [{ expenses: groupExpenses.map((a) => ({ amount: a, currency: "KGS" })) }]
      : [],
    extraExpenses: extraExpenses.map((a, i) => ({
      id: `ee-${id}-${i}`,
      amount: a,
      currency: "KGS",
      description: "Реклама",
      createdAt: new Date(),
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH & ROLE GUARDS
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/salary — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(403);
  });

  it("returns 200 for ADMIN role", async () => {
    mockSession("ADMIN");
    prismaMock.departure.findMany.mockResolvedValue([]);
    expect((await GET(makeRequest(BASE_URL))).status).toBe(200);
  });

  it("returns 200 for SENIOR_MANAGER role", async () => {
    mockSession("SENIOR_MANAGER");
    prismaMock.departure.findMany.mockResolvedValue([]);
    expect((await GET(makeRequest(BASE_URL))).status).toBe(200);
  });

  it("returns 200 for FINANCE role", async () => {
    mockSession("FINANCE");
    prismaMock.departure.findMany.mockResolvedValue([]);
    expect((await GET(makeRequest(BASE_URL))).status).toBe(200);
  });
});

describe("GET /api/admin/salary — params", () => {
  it("returns 400 when 'from' is missing", async () => {
    mockSession("ADMIN");
    expect((await GET(makeRequest("/api/admin/salary?to=2026-06-30"))).status).toBe(400);
  });

  it("returns 400 when 'to' is missing", async () => {
    mockSession("ADMIN");
    expect((await GET(makeRequest("/api/admin/salary?from=2026-06-01"))).status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BASIC PROFIT & SALARY CALCULATION
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/salary — basic calculation", () => {
  it("calculates netProfit = revenue - tourExpenses - extraExpenses", async () => {
    mockSession("ADMIN");
    // revenue: 10000 + 15000 = 25000
    // expenses: 8000 + 2000 = 10000  extra: 1000
    // netProfit: 14000
    const dep = makeDeparture({
      applications: [
        makeApp({ id: "a1", persons: 2, finalPrice: 10000 }),
        makeApp({ id: "a2", persons: 3, managerId: "mgr-b", managerName: "Менеджер Б", finalPrice: 15000 }),
      ],
      groupExpenses: [8000, 2000],
      extraExpenses: [1000],
    });
    prismaMock.departure.findMany.mockResolvedValue([dep] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    expect(data.departures[0].revenue).toBe(25000);
    expect(data.departures[0].tourExpenses).toBe(10000);
    expect(data.departures[0].totalExtraExpenses).toBe(1000);
    expect(data.departures[0].netProfit).toBe(14000);
  });

  it("calculates salary as 4% of proportional profit share", async () => {
    mockSession("ADMIN");
    // totalPersons=5, netProfit=14000, no loss adjustment
    // MgrA (2 persons): share = 2/5*14000 = 5600, salary = round(5600*0.04) = 224
    // MgrB (3 persons): share = 3/5*14000 = 8400, salary = round(8400*0.04) = 336
    const dep = makeDeparture({
      applications: [
        makeApp({ id: "a1", persons: 2, finalPrice: 10000 }),
        makeApp({ id: "a2", persons: 3, managerId: "mgr-b", managerName: "Менеджер Б", finalPrice: 15000 }),
      ],
      groupExpenses: [8000, 2000],
      extraExpenses: [1000],
    });
    prismaMock.departure.findMany.mockResolvedValue([dep] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    const mgrA = data.departures[0].managerBreakdown.find((m: { managerId: string }) => m.managerId === "mgr-a");
    const mgrB = data.departures[0].managerBreakdown.find((m: { managerId: string }) => m.managerId === "mgr-b");

    expect(mgrA.profitShare).toBe(5600);
    expect(mgrA.salary).toBe(224);
    expect(mgrB.profitShare).toBe(8400);
    expect(mgrB.salary).toBe(336);
  });

  it("returns salary=0 and adjustedProfit=0 when single tour is negative", async () => {
    mockSession("ADMIN");
    // revenue=10000, expenses=30000 → netProfit=-20000
    // No profitable tours to distribute to → salary stays 0
    const dep = makeDeparture({
      applications: [makeApp({ finalPrice: 10000 })],
      groupExpenses: [30000],
    });
    prismaMock.departure.findMany.mockResolvedValue([dep] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    const d = data.departures[0];

    expect(d.netProfit).toBe(-20000);
    expect(d.adjustedProfit).toBe(0);
    d.managerBreakdown.forEach((m: { salary: number }) => {
      expect(m.salary).toBe(0);
    });
  });

  it("handles applications without managerId correctly", async () => {
    mockSession("ADMIN");
    const dep = makeDeparture({
      applications: [makeApp({ managerId: null, persons: 4 })],
    });
    prismaMock.departure.findMany.mockResolvedValue([dep] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    expect(data.departures[0].managerBreakdown).toHaveLength(0);
    expect(data.departures[0].unassignedPersons).toBe(4);
  });

  it("returns zero totals when no departures in range", async () => {
    mockSession("ADMIN");
    prismaMock.departure.findMany.mockResolvedValue([]);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    expect(data.departures).toHaveLength(0);
    expect(data.totals.revenue).toBe(0);
    expect(data.totals.netProfit).toBe(0);
    expect(data.totals.totalSalary).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOSS DISTRIBUTION ACROSS PROFITABLE TOURS
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/salary — loss distribution", () => {
  it("deducts negative tour loss equally from profitable tours (2 positive + 1 negative)", async () => {
    mockSession("ADMIN");
    // Tour 1: revenue=20000, expenses=5000 → profit=+15000
    // Tour 2: revenue=20000, expenses=5000 → profit=+15000
    // Tour 3: revenue=2000,  expenses=10000 → profit=-8000
    //
    // totalNegative=8000, profitableCount=2 → lossPerDep=4000
    // Tour1 adjustedProfit = 15000 - 4000 = 11000
    // Tour2 adjustedProfit = 15000 - 4000 = 11000
    const t1 = makeDeparture({ id: "dep-1", applications: [makeApp({ id: "a1", finalPrice: 20000 })], groupExpenses: [5000] });
    const t2 = makeDeparture({ id: "dep-2", title: "Ала-Арча", applications: [makeApp({ id: "a2", finalPrice: 20000 })], groupExpenses: [5000] });
    const t3 = makeDeparture({ id: "dep-3", title: "Убыточный", applications: [makeApp({ id: "a3", finalPrice: 2000 })], groupExpenses: [10000] });

    prismaMock.departure.findMany.mockResolvedValue([t1, t2, t3] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    const [r1, r2, r3] = data.departures;

    expect(r1.netProfit).toBe(15000);
    expect(r1.adjustedProfit).toBe(11000);
    expect(r1.lossAdjustment).toBe(4000);

    expect(r2.netProfit).toBe(15000);
    expect(r2.adjustedProfit).toBe(11000);
    expect(r2.lossAdjustment).toBe(4000);

    // Negative tour: adjustedProfit=0, lossAdjustment=0 (it is the loss source)
    expect(r3.netProfit).toBe(-8000);
    expect(r3.adjustedProfit).toBe(0);
    expect(r3.lossAdjustment).toBe(0);
  });

  it("salaries use adjustedProfit, not netProfit", async () => {
    mockSession("ADMIN");
    // Tour1: revenue=20000, expenses=5000 → profit=+15000
    // Tour2 (loss): revenue=2000, expenses=10000 → profit=-8000
    // Only 1 profitable tour → lossPerDep = 8000/1 = 8000
    // adjustedProfit = max(0, 15000-8000) = 7000
    // Manager (2 persons, all profit): share=7000, salary=round(7000*0.04)=280
    const t1 = makeDeparture({
      id: "dep-1",
      applications: [makeApp({ id: "a1", persons: 2, finalPrice: 20000 })],
      groupExpenses: [5000],
    });
    const t2 = makeDeparture({
      id: "dep-2",
      title: "Убыточный",
      applications: [makeApp({ id: "a2", finalPrice: 2000 })],
      groupExpenses: [10000],
    });
    prismaMock.departure.findMany.mockResolvedValue([t1, t2] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    const mgr = data.departures[0].managerBreakdown[0];

    expect(mgr.profitShare).toBe(7000);
    expect(mgr.salary).toBe(280);
  });

  it("distributes loss across all 3 profitable tours when 1 is negative", async () => {
    mockSession("ADMIN");
    // 3 profitable tours, profit=9000 each. 1 negative tour: -3000
    // lossPerDep = 3000/3 = 1000, each adjusted = 9000-1000 = 8000
    const profitable = [1, 2, 3].map((n) =>
      makeDeparture({
        id: `dep-${n}`,
        title: `Тур ${n}`,
        applications: [makeApp({ id: `a${n}`, finalPrice: 10000 })],
        groupExpenses: [1000],
      })
    );
    const negative = makeDeparture({
      id: "dep-neg",
      title: "Убыточный",
      applications: [makeApp({ id: "aneg", finalPrice: 2000 })],
      groupExpenses: [5000],
    });
    prismaMock.departure.findMany.mockResolvedValue([...profitable, negative] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    const profitableDeps = data.departures.filter((d: { netProfit: number }) => d.netProfit > 0);

    profitableDeps.forEach((d: { adjustedProfit: number; lossAdjustment: number }) => {
      expect(d.adjustedProfit).toBe(8000);
      expect(d.lossAdjustment).toBe(1000);
    });
  });

  it("all tours negative: salary remains 0 for everyone", async () => {
    mockSession("ADMIN");
    const t1 = makeDeparture({ id: "dep-1", applications: [makeApp({ id: "a1", finalPrice: 1000 })], groupExpenses: [5000] });
    const t2 = makeDeparture({ id: "dep-2", title: "Тур 2", applications: [makeApp({ id: "a2", finalPrice: 2000 })], groupExpenses: [8000] });
    prismaMock.departure.findMany.mockResolvedValue([t1, t2] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    data.departures.forEach((dep: { adjustedProfit: number; managerBreakdown: { salary: number }[] }) => {
      expect(dep.adjustedProfit).toBe(0);
      dep.managerBreakdown.forEach((m) => expect(m.salary).toBe(0));
    });
    expect(data.totals.totalSalary).toBe(0);
  });

  it("loss exactly equals profit: adjustedProfit collapses to 0", async () => {
    mockSession("ADMIN");
    // Tour1: profit = +5000. Tour2: loss = -5000. After distribution: 5000-5000=0
    const t1 = makeDeparture({ id: "dep-1", applications: [makeApp({ id: "a1", finalPrice: 10000 })], groupExpenses: [5000] });
    const t2 = makeDeparture({ id: "dep-2", title: "Убыточный", applications: [makeApp({ id: "a2", finalPrice: 1000 })], groupExpenses: [6000] });
    prismaMock.departure.findMany.mockResolvedValue([t1, t2] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    const profitable = data.departures.find((d: { netProfit: number }) => d.netProfit > 0);

    expect(profitable.adjustedProfit).toBe(0);
    profitable.managerBreakdown.forEach((m: { salary: number }) => expect(m.salary).toBe(0));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NO-SHOW: revenue uses depositPaid, not finalPrice
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/salary — NO_SHOW revenue calculation", () => {
  it("counts depositPaid (not finalPrice) for NO_SHOW bookings", async () => {
    mockSession("ADMIN");
    // Tourist paid 2000 deposit but didn't show. finalPrice=10000.
    // Revenue should be 2000, not 10000.
    const dep = makeDeparture({
      applications: [
        makeApp({ id: "a1", status: "NO_SHOW", finalPrice: 10000, depositPaid: 2000, persons: 1 }),
      ],
      groupExpenses: [1000],
    });
    prismaMock.departure.findMany.mockResolvedValue([dep] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    expect(data.departures[0].revenue).toBe(2000);
  });

  it("mixes NO_SHOW and regular bookings correctly", async () => {
    mockSession("ADMIN");
    // App1: regular, finalPrice=10000, depositPaid=5000 → revenue += 10000
    // App2: NO_SHOW, finalPrice=10000, depositPaid=3000 → revenue += 3000
    // Total revenue = 13000
    const dep = makeDeparture({
      applications: [
        makeApp({ id: "a1", status: "DEPOSIT", finalPrice: 10000, depositPaid: 5000, persons: 1 }),
        makeApp({ id: "a2", status: "NO_SHOW", finalPrice: 10000, depositPaid: 3000, persons: 1, managerId: "mgr-b", managerName: "Менеджер Б" }),
      ],
      groupExpenses: [5000],
    });
    prismaMock.departure.findMany.mockResolvedValue([dep] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    expect(data.departures[0].revenue).toBe(13000);
    expect(data.departures[0].netProfit).toBe(8000); // 13000 - 5000
  });

  it("tour goes negative when all tourists no-show with low deposits", async () => {
    mockSession("ADMIN");
    // 3 tourists, all NO_SHOW. Each finalPrice=10000, depositPaid=500.
    // Revenue = 3 * 500 = 1500. Expenses = 8000.
    // netProfit = 1500 - 8000 = -6500
    const dep = makeDeparture({
      applications: [
        makeApp({ id: "a1", status: "NO_SHOW", finalPrice: 10000, depositPaid: 500, persons: 1 }),
        makeApp({ id: "a2", status: "NO_SHOW", finalPrice: 10000, depositPaid: 500, persons: 1, managerId: "mgr-b", managerName: "Менеджер Б" }),
        makeApp({ id: "a3", status: "NO_SHOW", finalPrice: 10000, depositPaid: 500, persons: 1, managerId: "mgr-c", managerName: "Менеджер В" }),
      ],
      groupExpenses: [8000],
    });
    prismaMock.departure.findMany.mockResolvedValue([dep] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    const d = data.departures[0];

    expect(d.revenue).toBe(1500);
    expect(d.netProfit).toBe(-6500);
    expect(d.adjustedProfit).toBe(0);
    d.managerBreakdown.forEach((m: { salary: number }) => {
      expect(m.salary).toBe(0);
    });
  });

  it("no-show-driven negative tour distributes its loss to other profitable tours", async () => {
    mockSession("ADMIN");
    // NO_SHOW tour: revenue=500(deposit), expenses=5000 → profit=-4500
    // Profitable tour: revenue=20000, expenses=5000 → profit=+15000
    // Loss distributed: 15000 - 4500 = 10500 adjustedProfit on profitable tour
    const noShowTour = makeDeparture({
      id: "dep-noshow",
      title: "Тур-Без явки",
      applications: [
        makeApp({ id: "a1", status: "NO_SHOW", finalPrice: 10000, depositPaid: 500, persons: 1 }),
      ],
      groupExpenses: [5000],
    });
    const profitableTour = makeDeparture({
      id: "dep-good",
      title: "Прибыльный тур",
      applications: [
        makeApp({ id: "a2", finalPrice: 20000, persons: 2 }),
      ],
      groupExpenses: [5000],
    });
    prismaMock.departure.findMany.mockResolvedValue([noShowTour, profitableTour] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    const noShow = data.departures.find((d: { id: string }) => d.id === "dep-noshow");
    const good = data.departures.find((d: { id: string }) => d.id === "dep-good");

    expect(noShow.netProfit).toBe(-4500);
    expect(noShow.adjustedProfit).toBe(0);

    expect(good.netProfit).toBe(15000);
    expect(good.adjustedProfit).toBe(10500);
    expect(good.lossAdjustment).toBe(4500);

    // Manager salary on good tour uses adjustedProfit
    // 2 persons, all profit to one manager → share=10500, salary=round(10500*0.04)=420
    expect(good.managerBreakdown[0].profitShare).toBe(10500);
    expect(good.managerBreakdown[0].salary).toBe(420);
  });

  it("wrong calculation prevented: using finalPrice for NO_SHOW would inflate revenue", async () => {
    mockSession("ADMIN");
    // Prove that if NO_SHOW used finalPrice=10000 instead of depositPaid=500,
    // revenue would be 10000 (wrong) vs 500 (correct)
    const dep = makeDeparture({
      applications: [
        makeApp({ id: "a1", status: "NO_SHOW", finalPrice: 10000, depositPaid: 500, persons: 1 }),
      ],
    });
    prismaMock.departure.findMany.mockResolvedValue([dep] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    // Revenue must NOT equal finalPrice; it must equal depositPaid
    expect(data.departures[0].revenue).not.toBe(10000);
    expect(data.departures[0].revenue).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY & TOTALS
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/admin/salary — summary accumulation", () => {
  it("accumulates salary across multiple profitable departures for same manager", async () => {
    mockSession("ADMIN");
    // Manager A has 2 tourists in dep-1 (profit 10000) and 2 in dep-2 (profit 10000)
    // Both tours have no losses to distribute.
    // Salary per tour: round(10000 * 0.04) = 400. Total: 800
    const t1 = makeDeparture({
      id: "dep-1",
      applications: [makeApp({ id: "a1", finalPrice: 10000, persons: 2 })],
    });
    const t2 = makeDeparture({
      id: "dep-2",
      title: "Тур 2",
      applications: [makeApp({ id: "a2", finalPrice: 10000, persons: 2 })],
    });
    prismaMock.departure.findMany.mockResolvedValue([t1, t2] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    const summary = data.summary.find((m: { managerId: string }) => m.managerId === "mgr-a");

    expect(summary.totalSalary).toBe(800);
    expect(summary.totalPersons).toBe(4);
  });

  it("totals.netProfit sums all departures including negatives", async () => {
    mockSession("ADMIN");
    // dep-1: +15000, dep-2: -8000 → total: +7000
    const t1 = makeDeparture({ id: "dep-1", applications: [makeApp({ id: "a1", finalPrice: 20000 })], groupExpenses: [5000] });
    const t2 = makeDeparture({ id: "dep-2", title: "Убыточный", applications: [makeApp({ id: "a2", finalPrice: 2000 })], groupExpenses: [10000] });
    prismaMock.departure.findMany.mockResolvedValue([t1, t2] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    expect(data.totals.netProfit).toBe(7000);
  });

  it("totalSalary in totals matches sum of manager salaries after loss distribution", async () => {
    mockSession("ADMIN");
    // dep-1: profit=15000, after absorbing -8000 loss → adjustedProfit=7000
    // Manager A (all 2 persons): salary = round(7000 * 0.04) = 280
    const t1 = makeDeparture({
      id: "dep-1",
      applications: [makeApp({ id: "a1", persons: 2, finalPrice: 20000 })],
      groupExpenses: [5000],
    });
    const t2 = makeDeparture({
      id: "dep-2",
      title: "Убыточный",
      applications: [makeApp({ id: "a2", finalPrice: 2000 })],
      groupExpenses: [10000],
    });
    prismaMock.departure.findMany.mockResolvedValue([t1, t2] as never);

    const data = await (await GET(makeRequest(BASE_URL))).json();
    const summaryTotal = data.summary.reduce((s: number, m: { totalSalary: number }) => s + m.totalSalary, 0);

    expect(data.totals.totalSalary).toBe(summaryTotal);
    expect(data.totals.totalSalary).toBe(280);
  });
});
