/**
 * Tests: GET /api/site/tours/[tourId]/departures
 * Covers: public endpoint (no auth), returns OPEN future departures,
 *         calculates maxSeats from groups, returns null when no groups.
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/site/tours/[tourId]/departures/route";
import { prismaMock } from "../../helpers/prisma";
import { makeRequest, makeParams } from "../../helpers/request";

function makeDeparture(overrides = {}) {
  return {
    id: "dep-1",
    tourId: "tour-1",
    departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    status: "OPEN",
    note: null,
    _count: { applications: 3 },
    groups: [],
    ...overrides,
  };
}

// ─── Public access ─────────────────────────────────────────────────────────

describe("GET /api/site/tours/[tourId]/departures — public", () => {
  it("returns departures without auth", async () => {
    prismaMock.departure.findMany.mockResolvedValue([makeDeparture()] as never);

    const res = await GET(
      makeRequest("/api/site/tours/tour-1/departures"),
      makeParams({ tourId: "tour-1" })
    );
    expect(res.status).toBe(200);
  });

  it("returns empty array when no open departures", async () => {
    prismaMock.departure.findMany.mockResolvedValue([]);

    const res = await GET(
      makeRequest("/api/site/tours/tour-1/departures"),
      makeParams({ tourId: "tour-1" })
    );
    const data = await res.json();
    expect(data).toHaveLength(0);
  });
});

// ─── Seat calculation ──────────────────────────────────────────────────────

describe("GET /api/site/tours/[tourId]/departures — seat info", () => {
  it("returns maxSeats=null when departure has no groups", async () => {
    prismaMock.departure.findMany.mockResolvedValue([makeDeparture({ groups: [] })] as never);

    const res = await GET(
      makeRequest("/api/site/tours/tour-1/departures"),
      makeParams({ tourId: "tour-1" })
    );
    const data = await res.json();
    expect(data[0].maxSeats).toBeNull();
  });

  it("sums maxSeats across groups when groups exist", async () => {
    const departure = makeDeparture({
      groups: [
        { maxSeats: 15, _count: { applications: 5 } },
        { maxSeats: 10, _count: { applications: 3 } },
      ],
    });
    prismaMock.departure.findMany.mockResolvedValue([departure] as never);

    const res = await GET(
      makeRequest("/api/site/tours/tour-1/departures"),
      makeParams({ tourId: "tour-1" })
    );
    const data = await res.json();
    expect(data[0].maxSeats).toBe(25);
    expect(data[0].groupApplications).toBe(8);
  });

  it("includes applicationCount from _count", async () => {
    prismaMock.departure.findMany.mockResolvedValue([makeDeparture({ _count: { applications: 7 } })] as never);

    const res = await GET(
      makeRequest("/api/site/tours/tour-1/departures"),
      makeParams({ tourId: "tour-1" })
    );
    const data = await res.json();
    expect(data[0].applicationCount).toBe(7);
  });
});
