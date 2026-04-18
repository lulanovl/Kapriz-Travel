/**
 * Tests: GET + PATCH + DELETE /api/admin/departures/[id]
 * Covers: auth, role guards, 404, delete blocked when apps exist.
 */
import { describe, it, expect } from "vitest";
import { GET, PATCH, DELETE } from "@/app/api/admin/departures/[id]/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const DEP_FIXTURE = {
  id: "dep-1",
  tourId: "t-1",
  departureDate: new Date("2026-06-15"),
  status: "OPEN",
  note: null,
  tour: { id: "t-1", title: "Иссык-Куль", slug: "issyk-kul", basePrice: 5000, duration: 2 },
  groups: [],
  applications: [],
};

// ─── GET departure detail ──────────────────────────────────────────────────

describe("GET /api/admin/departures/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(makeRequest("/api/admin/departures/dep-1"), makeParams({ id: "dep-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when departure not found", async () => {
    mockSession("ADMIN");
    prismaMock.departure.findUnique.mockResolvedValue(null);

    const res = await GET(makeRequest("/api/admin/departures/nope"), makeParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });

  it("returns departure for any authenticated role", async () => {
    mockSession("MANAGER");
    prismaMock.departure.findUnique.mockResolvedValue(DEP_FIXTURE as never);

    const res = await GET(makeRequest("/api/admin/departures/dep-1"), makeParams({ id: "dep-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("dep-1");
  });
});

// ─── PATCH departure ──────────────────────────────────────────────────────

describe("PATCH /api/admin/departures/[id] — role guard", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/departures/dep-1", "PATCH", { status: "CLOSED" });
    const res = await PATCH(req, makeParams({ id: "dep-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/departures/dep-1", "PATCH", { status: "CLOSED" });
    const res = await PATCH(req, makeParams({ id: "dep-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const req = makeRequest("/api/admin/departures/dep-1", "PATCH", { status: "CLOSED" });
    const res = await PATCH(req, makeParams({ id: "dep-1" }));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/departures/[id] — updates", () => {
  it("updates status for ADMIN", async () => {
    mockSession("ADMIN");
    prismaMock.departure.update.mockResolvedValue({ ...DEP_FIXTURE, status: "CLOSED" } as never);

    const req = makeRequest("/api/admin/departures/dep-1", "PATCH", { status: "CLOSED" });
    const res = await PATCH(req, makeParams({ id: "dep-1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.departure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CLOSED" }),
      })
    );
  });

  it("updates status for SENIOR_MANAGER", async () => {
    mockSession("SENIOR_MANAGER");
    prismaMock.departure.update.mockResolvedValue({ ...DEP_FIXTURE, status: "CANCELLED" } as never);

    const req = makeRequest("/api/admin/departures/dep-1", "PATCH", { status: "CANCELLED" });
    const res = await PATCH(req, makeParams({ id: "dep-1" }));
    expect(res.status).toBe(200);
  });

  it("updates note and departureDate for ADMIN", async () => {
    mockSession("ADMIN");
    prismaMock.departure.update.mockResolvedValue({ ...DEP_FIXTURE, note: "перенос" } as never);

    const req = makeRequest("/api/admin/departures/dep-1", "PATCH", {
      note: "перенос",
      departureDate: "2026-07-20",
    });
    const res = await PATCH(req, makeParams({ id: "dep-1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.departure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ note: "перенос" }),
      })
    );
  });
});

// ─── DELETE departure ──────────────────────────────────────────────────────

describe("DELETE /api/admin/departures/[id] — role guard", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await DELETE(makeRequest("/api/admin/departures/dep-1", "DELETE"), makeParams({ id: "dep-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER", async () => {
    mockSession("MANAGER");
    const res = await DELETE(makeRequest("/api/admin/departures/dep-1", "DELETE"), makeParams({ id: "dep-1" }));
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/departures/[id] — deletion logic", () => {
  it("returns 400 when applications exist", async () => {
    mockSession("ADMIN");
    prismaMock.application.count.mockResolvedValue(3);

    const res = await DELETE(makeRequest("/api/admin/departures/dep-1", "DELETE"), makeParams({ id: "dep-1" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/3/);
  });

  it("deletes departure when no applications", async () => {
    mockSession("ADMIN");
    prismaMock.application.count.mockResolvedValue(0);
    prismaMock.departure.delete.mockResolvedValue(DEP_FIXTURE as never);

    const res = await DELETE(makeRequest("/api/admin/departures/dep-1", "DELETE"), makeParams({ id: "dep-1" }));
    expect(res.status).toBe(200);
    expect(prismaMock.departure.delete).toHaveBeenCalledWith({ where: { id: "dep-1" } });
  });
});
