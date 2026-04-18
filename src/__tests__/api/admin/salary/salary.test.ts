/**
 * Tests: GET /api/admin/salary
 * Covers: auth, role guard (MANAGER blocked), param validation,
 *         profit calculation logic (revenue - expenses - extraExpenses),
 *         salary = 4% of profit share, negative profit → salary 0.
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/admin/salary/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest } from "../../../helpers/request";

const BASE_URL = "/api/admin/salary?from=2026-06-01&to=2026-06-30";

// Departure with 2 apps (one per manager), expenses and extra expenses
function makeDeparture(overrides = {}) {
  return {
    id: "dep-1",
    tourId: "t-1",
    departureDate: new Date("2026-06-15"),
    tour: { id: "t-1", title: "Иссык-Куль" },
    applications: [
      {
        id: "app-1",
        persons: 2,
        managerId: "user-manager",
        manager: { id: "user-manager", name: "Менеджер А" },
        booking: { finalPrice: 10000, currency: "KGS" },
      },
      {
        id: "app-2",
        persons: 3,
        managerId: "user-manager2",
        manager: { id: "user-manager2", name: "Менеджер Б" },
        booking: { finalPrice: 15000, currency: "KGS" },
      },
    ],
    groups: [
      {
        expenses: [
          { amount: 8000, currency: "KGS" },
          { amount: 2000, currency: "KGS" },
        ],
      },
    ],
    extraExpenses: [
      { id: "ee-1", amount: 1000, currency: "KGS", description: "Реклама", createdAt: new Date() },
    ],
    ...overrides,
  };
}

// ─── Auth guard ────────────────────────────────────────────────────────────

describe("GET /api/admin/salary — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/salary — role guard", () => {
  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(403);
  });

  it("returns 200 for ADMIN role", async () => {
    mockSession("ADMIN");
    prismaMock.departure.findMany.mockResolvedValue([]);
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(200);
  });

  it("returns 200 for SENIOR_MANAGER role", async () => {
    mockSession("SENIOR_MANAGER");
    prismaMock.departure.findMany.mockResolvedValue([]);
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(200);
  });

  it("returns 200 for FINANCE role", async () => {
    mockSession("FINANCE");
    prismaMock.departure.findMany.mockResolvedValue([]);
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(200);
  });
});

// ─── Param validation ──────────────────────────────────────────────────────

describe("GET /api/admin/salary — params", () => {
  it("returns 400 when 'from' is missing", async () => {
    mockSession("ADMIN");
    const res = await GET(makeRequest("/api/admin/salary?to=2026-06-30"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'to' is missing", async () => {
    mockSession("ADMIN");
    const res = await GET(makeRequest("/api/admin/salary?from=2026-06-01"));
    expect(res.status).toBe(400);
  });
});

// ─── Profit calculation ────────────────────────────────────────────────────

describe("GET /api/admin/salary — profit calculation", () => {
  it("calculates netProfit = revenue - tourExpenses - extraExpenses", async () => {
    mockSession("ADMIN");
    // revenue = 10000 + 15000 = 25000
    // tourExpenses = 8000 + 2000 = 10000
    // extraExpenses = 1000
    // netProfit = 25000 - 10000 - 1000 = 14000
    prismaMock.departure.findMany.mockResolvedValue([makeDeparture()] as never);

    const res = await GET(makeRequest(BASE_URL));
    const data = await res.json();

    const dep = data.departures[0];
    expect(dep.revenue).toBe(25000);
    expect(dep.tourExpenses).toBe(10000);
    expect(dep.totalExtraExpenses).toBe(1000);
    expect(dep.netProfit).toBe(14000);
  });

  it("calculates salary as 4% of proportional profit share", async () => {
    mockSession("ADMIN");
    // totalPersons = 2 + 3 = 5, netProfit = 14000
    // Manager A: 2/5 * 14000 = 5600 → salary = round(5600 * 0.04) = 224
    // Manager B: 3/5 * 14000 = 8400 → salary = round(8400 * 0.04) = 336
    prismaMock.departure.findMany.mockResolvedValue([makeDeparture()] as never);

    const res = await GET(makeRequest(BASE_URL));
    const data = await res.json();

    const managerA = data.departures[0].managerBreakdown.find(
      (m: { managerId: string }) => m.managerId === "user-manager"
    );
    const managerB = data.departures[0].managerBreakdown.find(
      (m: { managerId: string }) => m.managerId === "user-manager2"
    );
    expect(managerA.salary).toBe(224);
    expect(managerB.salary).toBe(336);
  });

  it("returns salary=0 when netProfit is negative", async () => {
    mockSession("ADMIN");
    // Make expenses exceed revenue
    const highExpenseDep = makeDeparture({
      groups: [{ expenses: [{ amount: 50000, currency: "KGS" }] }],
    });
    prismaMock.departure.findMany.mockResolvedValue([highExpenseDep] as never);

    const res = await GET(makeRequest(BASE_URL));
    const data = await res.json();

    const dep = data.departures[0];
    expect(dep.netProfit).toBeLessThan(0);
    dep.managerBreakdown.forEach((m: { salary: number }) => {
      expect(m.salary).toBe(0);
    });
  });

  it("accumulates totals across multiple departures", async () => {
    mockSession("ADMIN");
    prismaMock.departure.findMany.mockResolvedValue([makeDeparture(), makeDeparture()] as never);

    const res = await GET(makeRequest(BASE_URL));
    const data = await res.json();

    expect(data.totals.revenue).toBe(50000); // 25000 × 2
    expect(data.totals.netProfit).toBe(28000); // 14000 × 2
  });

  it("handles applications without managerId (unassigned persons)", async () => {
    mockSession("ADMIN");
    const dep = makeDeparture({
      applications: [
        {
          id: "app-no-mgr",
          persons: 4,
          managerId: null,
          manager: null,
          booking: { finalPrice: 10000, currency: "KGS" },
        },
      ],
    });
    prismaMock.departure.findMany.mockResolvedValue([dep] as never);

    const res = await GET(makeRequest(BASE_URL));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.departures[0].managerBreakdown).toHaveLength(0);
  });

  it("returns empty departures and zero totals when no departures in range", async () => {
    mockSession("ADMIN");
    prismaMock.departure.findMany.mockResolvedValue([]);

    const res = await GET(makeRequest(BASE_URL));
    const data = await res.json();

    expect(data.departures).toHaveLength(0);
    expect(data.totals.revenue).toBe(0);
    expect(data.totals.netProfit).toBe(0);
    expect(data.totals.totalSalary).toBe(0);
  });
});
