/**
 * Tests: GET + POST /api/admin/tours/[id]/departures
 * Covers: auth, role guards, validation, create departure with status OPEN.
 */
import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/admin/tours/[id]/departures/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const DEPARTURE_FIXTURE = {
  id: "dep-1",
  tourId: "tour-1",
  departureDate: new Date("2026-07-15"),
  status: "OPEN",
  note: null,
  groups: [],
  _count: { applications: 0 },
};

// ─── GET departures for tour ───────────────────────────────────────────────

describe("GET /api/admin/tours/[id]/departures", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(makeRequest("/api/admin/tours/tour-1/departures"), makeParams({ id: "tour-1" }));
    expect(res.status).toBe(401);
  });

  it("returns departures for any authenticated role", async () => {
    mockSession("FINANCE");
    prismaMock.departure.findMany.mockResolvedValue([DEPARTURE_FIXTURE] as never);

    const res = await GET(makeRequest("/api/admin/tours/tour-1/departures"), makeParams({ id: "tour-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].status).toBe("OPEN");
  });

  it("returns empty array when no departures", async () => {
    mockSession("MANAGER");
    prismaMock.departure.findMany.mockResolvedValue([]);

    const res = await GET(makeRequest("/api/admin/tours/tour-1/departures"), makeParams({ id: "tour-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(0);
  });
});

// ─── POST create departure ─────────────────────────────────────────────────

describe("POST /api/admin/tours/[id]/departures — auth and role", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/tours/tour-1/departures", "POST", { departureDate: "2026-07-15" });
    const res = await POST(req, makeParams({ id: "tour-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/tours/tour-1/departures", "POST", { departureDate: "2026-07-15" });
    const res = await POST(req, makeParams({ id: "tour-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const req = makeRequest("/api/admin/tours/tour-1/departures", "POST", { departureDate: "2026-07-15" });
    const res = await POST(req, makeParams({ id: "tour-1" }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/tours/[id]/departures — validation", () => {
  it("returns 400 when departureDate is missing", async () => {
    mockSession("ADMIN");
    const req = makeRequest("/api/admin/tours/tour-1/departures", "POST", { note: "без даты" });
    const res = await POST(req, makeParams({ id: "tour-1" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/tours/[id]/departures — creation", () => {
  it("creates departure with status OPEN and returns 201", async () => {
    mockSession("ADMIN");
    prismaMock.departure.create.mockResolvedValue(DEPARTURE_FIXTURE as never);

    const req = makeRequest("/api/admin/tours/tour-1/departures", "POST", { departureDate: "2026-07-15" });
    const res = await POST(req, makeParams({ id: "tour-1" }));

    expect(res.status).toBe(201);
    expect(prismaMock.departure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tourId: "tour-1", status: "OPEN" }),
      })
    );
  });

  it("creates departure for SENIOR_MANAGER", async () => {
    mockSession("SENIOR_MANAGER");
    prismaMock.departure.create.mockResolvedValue(DEPARTURE_FIXTURE as never);

    const req = makeRequest("/api/admin/tours/tour-1/departures", "POST", {
      departureDate: "2026-07-15",
      note: "Примечание",
    });
    const res = await POST(req, makeParams({ id: "tour-1" }));
    expect(res.status).toBe(201);
  });
});
