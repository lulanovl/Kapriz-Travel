/**
 * Tests: GET + POST /api/admin/departures/[id]/groups
 *        PATCH + DELETE /api/admin/groups/[id]
 *        GET + POST /api/admin/groups/[id]/expenses
 *        POST + GET /api/admin/groups/[id]/guide-token
 */
import { describe, it, expect } from "vitest";
import { GET as GET_GROUPS, POST as POST_GROUP } from "@/app/api/admin/departures/[id]/groups/route";
import { PATCH as PATCH_GROUP, DELETE as DELETE_GROUP } from "@/app/api/admin/groups/[id]/route";
import { GET as GET_EXPENSES, POST as POST_EXPENSE } from "@/app/api/admin/groups/[id]/expenses/route";
import { POST as POST_TOKEN, GET as GET_TOKEN } from "@/app/api/admin/groups/[id]/guide-token/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const GROUP_FIXTURE = {
  id: "group-1",
  departureId: "dep-1",
  name: "Бус 1",
  guideId: null,
  driverId: null,
  maxSeats: 15,
  notes: null,
  guide: null,
  driver: null,
  _count: { applications: 0 },
};

const EXPENSE_FIXTURE = {
  id: "exp-1",
  groupId: "group-1",
  category: "GUIDE",
  amount: 5000,
  currency: "KGS",
  note: "Гид Акылбек",
  createdAt: new Date(),
};

// ─── GET groups list ───────────────────────────────────────────────────────

describe("GET /api/admin/departures/[id]/groups", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET_GROUPS(makeRequest("/api/admin/departures/dep-1/groups"), makeParams({ id: "dep-1" }));
    expect(res.status).toBe(401);
  });

  it("returns groups for any authenticated role", async () => {
    mockSession("FINANCE");
    prismaMock.group.findMany.mockResolvedValue([GROUP_FIXTURE] as never);

    const res = await GET_GROUPS(makeRequest("/api/admin/departures/dep-1/groups"), makeParams({ id: "dep-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });
});

// ─── POST create group ─────────────────────────────────────────────────────

describe("POST /api/admin/departures/[id]/groups — auth and role", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/departures/dep-1/groups", "POST", { name: "Бус 2" });
    const res = await POST_GROUP(req, makeParams({ id: "dep-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const req = makeRequest("/api/admin/departures/dep-1/groups", "POST", { name: "Бус 2" });
    const res = await POST_GROUP(req, makeParams({ id: "dep-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/departures/dep-1/groups", "POST", { maxSeats: 20 });
    const res = await POST_GROUP(req, makeParams({ id: "dep-1" }));
    expect(res.status).toBe(400);
  });

  it("creates group and returns 201", async () => {
    mockSession("ADMIN");
    prismaMock.group.create.mockResolvedValue(GROUP_FIXTURE as never);

    const req = makeRequest("/api/admin/departures/dep-1/groups", "POST", { name: "Бус 1", maxSeats: 20 });
    const res = await POST_GROUP(req, makeParams({ id: "dep-1" }));

    expect(res.status).toBe(201);
    expect(prismaMock.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ departureId: "dep-1", name: "Бус 1" }),
      })
    );
  });

  it("defaults maxSeats to 15 when not provided", async () => {
    mockSession("ADMIN");
    prismaMock.group.create.mockResolvedValue(GROUP_FIXTURE as never);

    const req = makeRequest("/api/admin/departures/dep-1/groups", "POST", { name: "Бус 1" });
    await POST_GROUP(req, makeParams({ id: "dep-1" }));

    expect(prismaMock.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ maxSeats: 15 }),
      })
    );
  });
});

// ─── PATCH group ───────────────────────────────────────────────────────────

describe("PATCH /api/admin/groups/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await PATCH_GROUP(
      makeRequest("/api/admin/groups/group-1", "PATCH", { name: "Бус 2" }),
      makeParams({ id: "group-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const res = await PATCH_GROUP(
      makeRequest("/api/admin/groups/group-1", "PATCH", { name: "Бус 2" }),
      makeParams({ id: "group-1" })
    );
    expect(res.status).toBe(403);
  });

  it("updates group for MANAGER and returns 200", async () => {
    mockSession("MANAGER");
    prismaMock.group.update.mockResolvedValue({ ...GROUP_FIXTURE, name: "Бус 2" } as never);

    const res = await PATCH_GROUP(
      makeRequest("/api/admin/groups/group-1", "PATCH", { name: "Бус 2" }),
      makeParams({ id: "group-1" })
    );
    expect(res.status).toBe(200);
  });

  it("updates guideId, driverId, maxSeats, notes for ADMIN", async () => {
    mockSession("ADMIN");
    prismaMock.group.update.mockResolvedValue({ ...GROUP_FIXTURE, guideId: "staff-1", maxSeats: 20 } as never);

    const res = await PATCH_GROUP(
      makeRequest("/api/admin/groups/group-1", "PATCH", {
        guideId: "staff-1",
        driverId: "staff-2",
        maxSeats: 20,
        notes: "Важные заметки",
      }),
      makeParams({ id: "group-1" })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.group.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ guideId: "staff-1", driverId: "staff-2", maxSeats: 20 }),
      })
    );
  });
});

// ─── DELETE group ──────────────────────────────────────────────────────────

describe("DELETE /api/admin/groups/[id]", () => {
  it("returns 403 for MANAGER role — delete is ADMIN/SENIOR only", async () => {
    mockSession("MANAGER");
    const res = await DELETE_GROUP(
      makeRequest("/api/admin/groups/group-1", "DELETE"),
      makeParams({ id: "group-1" })
    );
    expect(res.status).toBe(403);
  });

  it("unassigns applications and deletes group for ADMIN", async () => {
    mockSession("ADMIN");
    prismaMock.application.updateMany.mockResolvedValue({ count: 2 } as never);
    prismaMock.group.delete.mockResolvedValue(GROUP_FIXTURE as never);

    const res = await DELETE_GROUP(
      makeRequest("/api/admin/groups/group-1", "DELETE"),
      makeParams({ id: "group-1" })
    );

    expect(res.status).toBe(200);
    expect(prismaMock.application.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { groupId: null } })
    );
    expect(prismaMock.group.delete).toHaveBeenCalledWith({ where: { id: "group-1" } });
  });
});

// ─── GET expenses ──────────────────────────────────────────────────────────

describe("GET /api/admin/groups/[id]/expenses", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET_EXPENSES(makeRequest("/api/admin/groups/group-1/expenses"), makeParams({ id: "group-1" }));
    expect(res.status).toBe(401);
  });

  it("returns expenses for any authenticated role", async () => {
    mockSession("FINANCE");
    prismaMock.expense.findMany.mockResolvedValue([EXPENSE_FIXTURE] as never);

    const res = await GET_EXPENSES(makeRequest("/api/admin/groups/group-1/expenses"), makeParams({ id: "group-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data[0].category).toBe("GUIDE");
  });
});

// ─── POST expense ──────────────────────────────────────────────────────────

describe("POST /api/admin/groups/[id]/expenses — auth and role", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/groups/group-1/expenses", "POST", { category: "GUIDE", amount: 5000 });
    const res = await POST_EXPENSE(req, makeParams({ id: "group-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/groups/group-1/expenses", "POST", { category: "GUIDE", amount: 5000 });
    const res = await POST_EXPENSE(req, makeParams({ id: "group-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when category or amount is missing", async () => {
    mockSession("FINANCE");
    const req = makeRequest("/api/admin/groups/group-1/expenses", "POST", { amount: 5000 });
    const res = await POST_EXPENSE(req, makeParams({ id: "group-1" }));
    expect(res.status).toBe(400);
  });

  it("creates expense and returns 200 for FINANCE", async () => {
    mockSession("FINANCE");
    prismaMock.expense.create.mockResolvedValue(EXPENSE_FIXTURE as never);

    const req = makeRequest("/api/admin/groups/group-1/expenses", "POST", {
      category: "GUIDE",
      amount: 5000,
      currency: "KGS",
      note: "Гид Акылбек",
    });
    const res = await POST_EXPENSE(req, makeParams({ id: "group-1" }));

    expect(res.status).toBe(200);
    expect(prismaMock.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ groupId: "group-1", category: "GUIDE", amount: 5000 }),
      })
    );
  });

  it("defaults currency to KGS and note to null when not provided", async () => {
    mockSession("ADMIN");
    prismaMock.expense.create.mockResolvedValue(EXPENSE_FIXTURE as never);

    const req = makeRequest("/api/admin/groups/group-1/expenses", "POST", {
      category: "DRIVER",
      amount: 2000,
    });
    await POST_EXPENSE(req, makeParams({ id: "group-1" }));

    expect(prismaMock.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currency: "KGS", note: null }),
      })
    );
  });
});

// ─── POST guide token ──────────────────────────────────────────────────────

describe("POST /api/admin/groups/[id]/guide-token", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await POST_TOKEN(makeRequest("/api/admin/groups/group-1/guide-token", "POST", {}), makeParams({ id: "group-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const res = await POST_TOKEN(makeRequest("/api/admin/groups/group-1/guide-token", "POST", {}), makeParams({ id: "group-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 404 when group not found", async () => {
    mockSession("ADMIN");
    prismaMock.group.findUnique.mockResolvedValue(null);

    const res = await POST_TOKEN(makeRequest("/api/admin/groups/nope/guide-token", "POST", {}), makeParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });

  it("creates token and returns it for MANAGER", async () => {
    mockSession("MANAGER");
    prismaMock.group.findUnique.mockResolvedValue(GROUP_FIXTURE as never);
    prismaMock.guideToken.create.mockResolvedValue({
      id: "gt-1",
      groupId: "group-1",
      token: "abc123token",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    } as never);

    const res = await POST_TOKEN(makeRequest("/api/admin/groups/group-1/guide-token", "POST", {}), makeParams({ id: "group-1" }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBe("abc123token");
  });

  it("uses custom days parameter when provided", async () => {
    mockSession("ADMIN");
    prismaMock.group.findUnique.mockResolvedValue(GROUP_FIXTURE as never);
    prismaMock.guideToken.create.mockResolvedValue({
      id: "gt-2",
      groupId: "group-1",
      token: "custom60token",
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    } as never);

    const res = await POST_TOKEN(
      makeRequest("/api/admin/groups/group-1/guide-token", "POST", { days: 60 }),
      makeParams({ id: "group-1" })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.guideToken.create).toHaveBeenCalled();
  });
});

// ─── GET guide tokens ──────────────────────────────────────────────────────

describe("GET /api/admin/groups/[id]/guide-token", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET_TOKEN(makeRequest("/api/admin/groups/group-1/guide-token"), makeParams({ id: "group-1" }));
    expect(res.status).toBe(401);
  });

  it("returns tokens list for any authenticated role", async () => {
    mockSession("MANAGER");
    prismaMock.guideToken.findMany.mockResolvedValue([]);

    const res = await GET_TOKEN(makeRequest("/api/admin/groups/group-1/guide-token"), makeParams({ id: "group-1" }));
    expect(res.status).toBe(200);
  });
});
