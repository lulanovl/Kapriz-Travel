/**
 * Tests: GET /api/admin/reports/managers
 * Covers: auth, role guard (MANAGER/FINANCE blocked), params validation,
 *         manager breakdown with totalPersons/totalApplications.
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/admin/reports/managers/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest } from "../../../helpers/request";

const BASE_URL = "/api/admin/reports/managers?from=2026-06-01&to=2026-06-30";

const MANAGERS_FIXTURE = [
  { id: "user-1", name: "Менеджер А", role: "MANAGER" },
  { id: "user-2", name: "Менеджер Б", role: "SENIOR_MANAGER" },
];

const APPLICATIONS_FIXTURE = [
  { managerId: "user-1", persons: 2, createdAt: new Date("2026-06-10"), status: "DEPOSIT" },
  { managerId: "user-1", persons: 3, createdAt: new Date("2026-06-15"), status: "ARCHIVE" },
  { managerId: "user-2", persons: 1, createdAt: new Date("2026-06-20"), status: "ON_TOUR" },
];

// ─── Auth guard ────────────────────────────────────────────────────────────

describe("GET /api/admin/reports/managers — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(401);
  });
});

// ─── Role guard ────────────────────────────────────────────────────────────

describe("GET /api/admin/reports/managers — role guard", () => {
  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(403);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(403);
  });

  it("returns 200 for ADMIN role", async () => {
    mockSession("ADMIN");
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.application.findMany.mockResolvedValue([]);
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(200);
  });

  it("returns 200 for SENIOR_MANAGER role", async () => {
    mockSession("SENIOR_MANAGER");
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.application.findMany.mockResolvedValue([]);
    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(200);
  });
});

// ─── Param validation ──────────────────────────────────────────────────────

describe("GET /api/admin/reports/managers — params", () => {
  it("returns 400 when 'from' is missing", async () => {
    mockSession("ADMIN");
    const res = await GET(makeRequest("/api/admin/reports/managers?to=2026-06-30"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when 'to' is missing", async () => {
    mockSession("ADMIN");
    const res = await GET(makeRequest("/api/admin/reports/managers?from=2026-06-01"));
    expect(res.status).toBe(400);
  });
});

// ─── Breakdown logic ───────────────────────────────────────────────────────

describe("GET /api/admin/reports/managers — breakdown", () => {
  it("calculates totalPersons and totalApplications per manager", async () => {
    mockSession("ADMIN");
    prismaMock.user.findMany.mockResolvedValue(MANAGERS_FIXTURE as never);
    prismaMock.application.findMany.mockResolvedValue(APPLICATIONS_FIXTURE as never);

    const res = await GET(makeRequest(BASE_URL));
    expect(res.status).toBe(200);
    const data = await res.json();

    const managerA = data.managers.find((m: { id: string }) => m.id === "user-1");
    expect(managerA.totalPersons).toBe(5);
    expect(managerA.totalApplications).toBe(2);

    const managerB = data.managers.find((m: { id: string }) => m.id === "user-2");
    expect(managerB.totalPersons).toBe(1);
    expect(managerB.totalApplications).toBe(1);
  });

  it("returns zero counts for manager with no applications", async () => {
    mockSession("ADMIN");
    prismaMock.user.findMany.mockResolvedValue([{ id: "user-3", name: "Без заявок", role: "MANAGER" }] as never);
    prismaMock.application.findMany.mockResolvedValue([]);

    const res = await GET(makeRequest(BASE_URL));
    const data = await res.json();

    expect(data.managers[0].totalPersons).toBe(0);
    expect(data.managers[0].totalApplications).toBe(0);
  });
});
