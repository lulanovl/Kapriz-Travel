/**
 * Tests: POST /api/admin/groups/[id]/assign
 * Covers: auth, role guard (FINANCE blocked), validation,
 *         assign sets IN_BUS status, unassign reverts to DEPOSIT.
 */
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/admin/groups/[id]/assign/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const GROUP_FIXTURE = {
  id: "group-1",
  departureId: "dep-1",
  name: "Бус 1",
  guideId: null,
  driverId: null,
  maxSeats: 20,
  notes: null,
};

// ─── Auth guard ────────────────────────────────────────────────────────────

describe("POST /api/admin/groups/[id]/assign — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/groups/group-1/assign", "POST", { applicationIds: ["app-1"] });
    const res = await POST(req, makeParams({ id: "group-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const req = makeRequest("/api/admin/groups/group-1/assign", "POST", { applicationIds: ["app-1"] });
    const res = await POST(req, makeParams({ id: "group-1" }));
    expect(res.status).toBe(403);
  });
});

// ─── Validation ────────────────────────────────────────────────────────────

describe("POST /api/admin/groups/[id]/assign — validation", () => {
  it("returns 400 when applicationIds is empty array", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/groups/group-1/assign", "POST", { applicationIds: [] });
    const res = await POST(req, makeParams({ id: "group-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when applicationIds is not array", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/groups/group-1/assign", "POST", { applicationIds: "app-1" });
    const res = await POST(req, makeParams({ id: "group-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when group not found (on assign)", async () => {
    mockSession("MANAGER");
    prismaMock.group.findUnique.mockResolvedValue(null);

    const req = makeRequest("/api/admin/groups/nope/assign", "POST", { applicationIds: ["app-1"] });
    const res = await POST(req, makeParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });
});

// ─── Assign ────────────────────────────────────────────────────────────────

describe("POST /api/admin/groups/[id]/assign — assigning", () => {
  it("sets groupId and status IN_BUS for assigned applications", async () => {
    mockSession("MANAGER");
    prismaMock.group.findUnique.mockResolvedValue(GROUP_FIXTURE as never);
    prismaMock.application.updateMany.mockResolvedValue({ count: 2 } as never);

    const req = makeRequest("/api/admin/groups/group-1/assign", "POST", {
      applicationIds: ["app-1", "app-2"],
    });
    const res = await POST(req, makeParams({ id: "group-1" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.assigned).toBe(2);

    expect(prismaMock.application.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["app-1", "app-2"] } },
        data: { groupId: "group-1", status: "IN_BUS" },
      })
    );
  });

  it("works for ADMIN role", async () => {
    mockSession("ADMIN");
    prismaMock.group.findUnique.mockResolvedValue(GROUP_FIXTURE as never);
    prismaMock.application.updateMany.mockResolvedValue({ count: 1 } as never);

    const req = makeRequest("/api/admin/groups/group-1/assign", "POST", { applicationIds: ["app-1"] });
    const res = await POST(req, makeParams({ id: "group-1" }));
    expect(res.status).toBe(200);
  });
});

// ─── Unassign ──────────────────────────────────────────────────────────────

describe("POST /api/admin/groups/[id]/assign — unassigning", () => {
  it("reverts IN_BUS applications to DEPOSIT and clears groupId", async () => {
    mockSession("ADMIN");
    prismaMock.application.updateMany.mockResolvedValue({ count: 1 } as never);

    const req = makeRequest("/api/admin/groups/group-1/assign", "POST", {
      applicationIds: ["app-1"],
      unassign: true,
    });
    const res = await POST(req, makeParams({ id: "group-1" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.unassigned).toBe(1);

    // First call: IN_BUS → DEPOSIT
    expect(prismaMock.application.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["app-1"] }, status: "IN_BUS" },
        data: { groupId: null, status: "DEPOSIT" },
      })
    );
  });
});
