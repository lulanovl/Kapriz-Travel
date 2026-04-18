/**
 * Tests: GET + POST /api/admin/tours/[id]/schedules
 *        PATCH + DELETE /api/admin/schedules/[id]
 * Covers: auth, role guards, validation, auto-generate departures,
 *         toggle active, delete schedule.
 */
import { describe, it, expect } from "vitest";
import { GET as GET_SCHEDULES, POST as POST_SCHEDULE } from "@/app/api/admin/tours/[id]/schedules/route";
import { PATCH as PATCH_SCHEDULE, DELETE as DELETE_SCHEDULE } from "@/app/api/admin/schedules/[id]/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const SCHEDULE_FIXTURE = {
  id: "sched-1",
  tourId: "tour-1",
  type: "WEEKLY",
  daysOfWeek: [6],
  rangeStart: null,
  rangeEnd: null,
  note: null,
  isActive: true,
  createdAt: new Date(),
};

// ─── GET schedules ─────────────────────────────────────────────────────────

describe("GET /api/admin/tours/[id]/schedules", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET_SCHEDULES(makeRequest("/api/admin/tours/tour-1/schedules"), makeParams({ id: "tour-1" }));
    expect(res.status).toBe(401);
  });

  it("returns schedules for any authenticated role", async () => {
    mockSession("MANAGER");
    prismaMock.tourSchedule.findMany.mockResolvedValue([SCHEDULE_FIXTURE] as never);

    const res = await GET_SCHEDULES(makeRequest("/api/admin/tours/tour-1/schedules"), makeParams({ id: "tour-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].type).toBe("WEEKLY");
  });
});

// ─── POST schedule ─────────────────────────────────────────────────────────

describe("POST /api/admin/tours/[id]/schedules — auth and role", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/tours/tour-1/schedules", "POST", { type: "WEEKLY", daysOfWeek: [6] });
    const res = await POST_SCHEDULE(req, makeParams({ id: "tour-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/tours/tour-1/schedules", "POST", { type: "WEEKLY", daysOfWeek: [6] });
    const res = await POST_SCHEDULE(req, makeParams({ id: "tour-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const req = makeRequest("/api/admin/tours/tour-1/schedules", "POST", { type: "WEEKLY", daysOfWeek: [6] });
    const res = await POST_SCHEDULE(req, makeParams({ id: "tour-1" }));
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/tours/[id]/schedules — validation", () => {
  it("returns 400 when type is missing", async () => {
    mockSession("ADMIN");
    const req = makeRequest("/api/admin/tours/tour-1/schedules", "POST", { daysOfWeek: [6] });
    const res = await POST_SCHEDULE(req, makeParams({ id: "tour-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for WEEKLY without daysOfWeek", async () => {
    mockSession("ADMIN");
    const req = makeRequest("/api/admin/tours/tour-1/schedules", "POST", { type: "WEEKLY", daysOfWeek: [] });
    const res = await POST_SCHEDULE(req, makeParams({ id: "tour-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for DATE_RANGE without rangeStart/rangeEnd", async () => {
    mockSession("ADMIN");
    const req = makeRequest("/api/admin/tours/tour-1/schedules", "POST", { type: "DATE_RANGE" });
    const res = await POST_SCHEDULE(req, makeParams({ id: "tour-1" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/tours/[id]/schedules — creation", () => {
  it("creates WEEKLY schedule and generates departures", async () => {
    mockSession("ADMIN");
    prismaMock.tourSchedule.create.mockResolvedValue(SCHEDULE_FIXTURE as never);
    prismaMock.departure.createMany.mockResolvedValue({ count: 8 } as never);

    const req = makeRequest("/api/admin/tours/tour-1/schedules", "POST", { type: "WEEKLY", daysOfWeek: [6] });
    const res = await POST_SCHEDULE(req, makeParams({ id: "tour-1" }));

    expect(res.status).toBe(201);
    expect(prismaMock.tourSchedule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tourId: "tour-1", type: "WEEKLY", isActive: true }),
      })
    );
  });

  it("creates DATE_RANGE schedule for SENIOR_MANAGER", async () => {
    mockSession("SENIOR_MANAGER");
    const rangeSchedule = { ...SCHEDULE_FIXTURE, type: "DATE_RANGE", daysOfWeek: [], rangeStart: new Date("2026-07-01"), rangeEnd: new Date("2026-07-03") };
    prismaMock.tourSchedule.create.mockResolvedValue(rangeSchedule as never);
    prismaMock.departure.createMany.mockResolvedValue({ count: 3 } as never);

    const req = makeRequest("/api/admin/tours/tour-1/schedules", "POST", {
      type: "DATE_RANGE",
      rangeStart: "2026-07-01",
      rangeEnd: "2026-07-03",
    });
    const res = await POST_SCHEDULE(req, makeParams({ id: "tour-1" }));

    expect(res.status).toBe(201);
  });
});

// ─── PATCH schedule ────────────────────────────────────────────────────────

describe("PATCH /api/admin/schedules/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await PATCH_SCHEDULE(
      makeRequest("/api/admin/schedules/sched-1", "PATCH", { isActive: false }),
      makeParams({ id: "sched-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const res = await PATCH_SCHEDULE(
      makeRequest("/api/admin/schedules/sched-1", "PATCH", { isActive: false }),
      makeParams({ id: "sched-1" })
    );
    expect(res.status).toBe(403);
  });

  it("toggles isActive for ADMIN and returns 200", async () => {
    mockSession("ADMIN");
    prismaMock.tourSchedule.update.mockResolvedValue({ ...SCHEDULE_FIXTURE, isActive: false } as never);

    const res = await PATCH_SCHEDULE(
      makeRequest("/api/admin/schedules/sched-1", "PATCH", { isActive: false }),
      makeParams({ id: "sched-1" })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.tourSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sched-1" },
        data: expect.objectContaining({ isActive: false }),
      })
    );
  });

  it("updates note, daysOfWeek, rangeStart, rangeEnd for SENIOR_MANAGER", async () => {
    mockSession("SENIOR_MANAGER");
    prismaMock.tourSchedule.update.mockResolvedValue({ ...SCHEDULE_FIXTURE, note: "обновлено" } as never);

    const res = await PATCH_SCHEDULE(
      makeRequest("/api/admin/schedules/sched-1", "PATCH", {
        note: "обновлено",
        daysOfWeek: [5, 6],
        rangeStart: "2026-07-01",
        rangeEnd: "2026-08-31",
      }),
      makeParams({ id: "sched-1" })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.tourSchedule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ note: "обновлено", daysOfWeek: [5, 6] }),
      })
    );
  });
});

// ─── DELETE schedule ───────────────────────────────────────────────────────

describe("DELETE /api/admin/schedules/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await DELETE_SCHEDULE(
      makeRequest("/api/admin/schedules/sched-1", "DELETE"),
      makeParams({ id: "sched-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const res = await DELETE_SCHEDULE(
      makeRequest("/api/admin/schedules/sched-1", "DELETE"),
      makeParams({ id: "sched-1" })
    );
    expect(res.status).toBe(403);
  });

  it("deletes schedule for ADMIN and returns ok", async () => {
    mockSession("ADMIN");
    prismaMock.tourSchedule.delete.mockResolvedValue(SCHEDULE_FIXTURE as never);

    const res = await DELETE_SCHEDULE(
      makeRequest("/api/admin/schedules/sched-1", "DELETE"),
      makeParams({ id: "sched-1" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(prismaMock.tourSchedule.delete).toHaveBeenCalledWith({ where: { id: "sched-1" } });
  });
});
