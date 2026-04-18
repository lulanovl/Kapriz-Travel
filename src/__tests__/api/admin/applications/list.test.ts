/**
 * Tests: GET /api/admin/applications
 * Covers: auth guard, role-based filtering (MANAGER vs others).
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/admin/applications/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest } from "../../../helpers/request";

const APPS_FIXTURE = [
  {
    id: "app-1",
    status: "NEW",
    managerId: "user-manager",
    client: { id: "c-1", name: "Иван", whatsapp: "+996700111", country: "KG" },
    tour: { id: "t-1", title: "Иссык-Куль" },
    departure: null,
    group: null,
    manager: { id: "user-manager", name: "Manager" },
    booking: null,
    createdAt: new Date(),
  },
  {
    id: "app-2",
    status: "CONTACT",
    managerId: "user-other",
    client: { id: "c-2", name: "Мария", whatsapp: "+996700222", country: "RU" },
    tour: { id: "t-1", title: "Иссык-Куль" },
    departure: null,
    group: null,
    manager: { id: "user-other", name: "Other" },
    booking: null,
    createdAt: new Date(),
  },
];

// ─── Auth guard ────────────────────────────────────────────────────────────

describe("GET /api/admin/applications — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

// ─── Role: ADMIN ───────────────────────────────────────────────────────────

describe("GET /api/admin/applications — ADMIN role", () => {
  it("returns all applications without filter", async () => {
    mockSession("ADMIN");
    prismaMock.application.findMany.mockResolvedValue(APPS_FIXTURE as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    // ADMIN gets no `where` filter
    expect(prismaMock.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined })
    );
  });
});

// ─── Role: SENIOR_MANAGER ──────────────────────────────────────────────────

describe("GET /api/admin/applications — SENIOR_MANAGER role", () => {
  it("returns all applications (same as admin)", async () => {
    mockSession("SENIOR_MANAGER");
    prismaMock.application.findMany.mockResolvedValue(APPS_FIXTURE as never);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(prismaMock.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined })
    );
  });
});

// ─── Role: MANAGER ─────────────────────────────────────────────────────────

describe("GET /api/admin/applications — MANAGER role", () => {
  it("filters applications to own + unassigned", async () => {
    mockSession("MANAGER", "user-manager");
    prismaMock.application.findMany.mockResolvedValue([APPS_FIXTURE[0]] as never);

    const res = await GET();
    expect(res.status).toBe(200);

    expect(prismaMock.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ managerId: "user-manager" }, { managerId: null }],
        },
      })
    );
  });
});

// ─── Role: FINANCE ─────────────────────────────────────────────────────────

describe("GET /api/admin/applications — FINANCE role", () => {
  it("returns 200 — finance can read applications list", async () => {
    mockSession("FINANCE");
    prismaMock.application.findMany.mockResolvedValue(APPS_FIXTURE as never);

    const res = await GET();
    expect(res.status).toBe(200);
  });
});
