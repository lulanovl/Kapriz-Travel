/**
 * Tests: GET + POST /api/admin/tours and GET + PUT + DELETE /api/admin/tours/[id]
 * Covers: auth, role guards (ADMIN/SENIOR_MANAGER only for mutations),
 *         validation, slug dedup, DELETE admin-only.
 */
import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/admin/tours/route";
import { GET as GET_ONE, PUT, DELETE } from "@/app/api/admin/tours/[id]/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const TOUR_FIXTURE = {
  id: "t-1",
  title: "Иссык-Куль",
  slug: "issyk-kul",
  description: "Красивый тур",
  basePrice: 5000,
  isActive: true,
  tourType: "relax",
  duration: 2,
  minGroupSize: 1,
  maxGroupSize: 20,
  itinerary: [],
  included: [],
  notIncluded: [],
  images: [],
  mapEmbed: null,
  seoTitle: null,
  seoDescription: null,
  createdAt: new Date(),
  _count: { departures: 2, applications: 10 },
};

const NEW_TOUR_BODY = {
  title: "Сон-Куль",
  basePrice: 7000,
  tourType: "relax",
};

// ─── GET list ──────────────────────────────────────────────────────────────

describe("GET /api/admin/tours — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/tours — all roles can list", () => {
  it("returns tours list for any authenticated user", async () => {
    mockSession("MANAGER");
    prismaMock.tour.findMany.mockResolvedValue([TOUR_FIXTURE] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });
});

// ─── POST create tour ──────────────────────────────────────────────────────

describe("POST /api/admin/tours — auth and role", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/tours", "POST", NEW_TOUR_BODY);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/tours", "POST", NEW_TOUR_BODY);
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const req = makeRequest("/api/admin/tours", "POST", NEW_TOUR_BODY);
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/tours — validation", () => {
  it("returns 400 when title is missing", async () => {
    mockSession("ADMIN");
    const req = makeRequest("/api/admin/tours", "POST", { basePrice: 5000 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when basePrice is missing", async () => {
    mockSession("ADMIN");
    const req = makeRequest("/api/admin/tours", "POST", { title: "Тур" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/tours — creation", () => {
  it("creates tour and returns 201 for ADMIN", async () => {
    mockSession("ADMIN");
    prismaMock.tour.findUnique.mockResolvedValue(null);
    prismaMock.tour.create.mockResolvedValue(TOUR_FIXTURE as never);

    const req = makeRequest("/api/admin/tours", "POST", NEW_TOUR_BODY);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("creates tour and returns 201 for SENIOR_MANAGER", async () => {
    mockSession("SENIOR_MANAGER");
    prismaMock.tour.findUnique.mockResolvedValue(null);
    prismaMock.tour.create.mockResolvedValue(TOUR_FIXTURE as never);

    const req = makeRequest("/api/admin/tours", "POST", NEW_TOUR_BODY);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("appends timestamp to slug when slug already exists", async () => {
    mockSession("ADMIN");
    prismaMock.tour.findUnique.mockResolvedValue(TOUR_FIXTURE as never); // slug conflict
    prismaMock.tour.create.mockResolvedValue(TOUR_FIXTURE as never);

    const req = makeRequest("/api/admin/tours", "POST", NEW_TOUR_BODY);
    await POST(req);

    const createCall = (prismaMock.tour.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createCall.data.slug).toMatch(/-\d+$/); // ends with -timestamp
  });
});

// ─── GET single tour ───────────────────────────────────────────────────────

describe("GET /api/admin/tours/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET_ONE(makeRequest("/api/admin/tours/t-1"), makeParams({ id: "t-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when tour not found", async () => {
    mockSession("MANAGER");
    prismaMock.tour.findUnique.mockResolvedValue(null);

    const res = await GET_ONE(makeRequest("/api/admin/tours/nope"), makeParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });

  it("returns tour for any authenticated role", async () => {
    mockSession("FINANCE");
    prismaMock.tour.findUnique.mockResolvedValue(TOUR_FIXTURE as never);

    const res = await GET_ONE(makeRequest("/api/admin/tours/t-1"), makeParams({ id: "t-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.slug).toBe("issyk-kul");
  });
});

describe("POST /api/admin/tours — with duration and group sizes", () => {
  it("parses duration, minGroupSize, maxGroupSize when provided", async () => {
    mockSession("ADMIN");
    prismaMock.tour.findUnique.mockResolvedValue(null);
    prismaMock.tour.create.mockResolvedValue(TOUR_FIXTURE as never);

    const req = makeRequest("/api/admin/tours", "POST", {
      ...NEW_TOUR_BODY,
      duration: "3",
      minGroupSize: "2",
      maxGroupSize: "15",
    });
    await POST(req);

    expect(prismaMock.tour.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ duration: 3, minGroupSize: 2, maxGroupSize: 15 }),
      })
    );
  });
});

// ─── PUT update tour ───────────────────────────────────────────────────────

describe("PUT /api/admin/tours/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/tours/t-1", "PUT", { title: "Updated", basePrice: 6000 });
    const res = await PUT(req, makeParams({ id: "t-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/tours/t-1", "PUT", { ...NEW_TOUR_BODY, title: "Updated" });
    const res = await PUT(req, makeParams({ id: "t-1" }));
    expect(res.status).toBe(403);
  });

  it("updates tour for ADMIN and returns 200", async () => {
    mockSession("ADMIN");
    prismaMock.tour.update.mockResolvedValue({ ...TOUR_FIXTURE, title: "Updated" } as never);

    const req = makeRequest("/api/admin/tours/t-1", "PUT", { title: "Updated", basePrice: 6000 });
    const res = await PUT(req, makeParams({ id: "t-1" }));
    expect(res.status).toBe(200);
  });

  it("parses duration, minGroupSize, maxGroupSize in PUT", async () => {
    mockSession("ADMIN");
    prismaMock.tour.update.mockResolvedValue(TOUR_FIXTURE as never);

    const req = makeRequest("/api/admin/tours/t-1", "PUT", {
      title: "Тур",
      basePrice: "5000",
      duration: "2",
      minGroupSize: "4",
      maxGroupSize: "12",
    });
    await PUT(req, makeParams({ id: "t-1" }));

    expect(prismaMock.tour.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ duration: 2, minGroupSize: 4, maxGroupSize: 12 }),
      })
    );
  });
});

// ─── DELETE tour ───────────────────────────────────────────────────────────

describe("DELETE /api/admin/tours/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await DELETE(makeRequest("/api/admin/tours/t-1", "DELETE"), makeParams({ id: "t-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for SENIOR_MANAGER — delete is ADMIN only", async () => {
    mockSession("SENIOR_MANAGER");
    const res = await DELETE(makeRequest("/api/admin/tours/t-1", "DELETE"), makeParams({ id: "t-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for MANAGER", async () => {
    mockSession("MANAGER");
    const res = await DELETE(makeRequest("/api/admin/tours/t-1", "DELETE"), makeParams({ id: "t-1" }));
    expect(res.status).toBe(403);
  });

  it("deletes tour for ADMIN and returns ok", async () => {
    mockSession("ADMIN");
    prismaMock.tour.delete.mockResolvedValue(TOUR_FIXTURE as never);

    const res = await DELETE(makeRequest("/api/admin/tours/t-1", "DELETE"), makeParams({ id: "t-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
