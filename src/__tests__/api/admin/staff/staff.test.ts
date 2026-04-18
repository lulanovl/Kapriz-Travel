/**
 * Tests: GET + POST /api/admin/staff  and  DELETE /api/admin/staff/[id]
 * Covers: auth, role guard (ADMIN/SENIOR_MANAGER mutate), validation.
 */
import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/admin/staff/route";
import { DELETE } from "@/app/api/admin/staff/[id]/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const STAFF_FIXTURE = [
  { id: "s-1", name: "Акылбек", role: "guide", phone: "+996700111", telegramChatId: null },
  { id: "s-2", name: "Бакыт", role: "driver", phone: "+996700222", telegramChatId: null },
];

// ─── GET staff list ────────────────────────────────────────────────────────

describe("GET /api/admin/staff — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/staff — all roles", () => {
  it("returns staff list for MANAGER", async () => {
    mockSession("MANAGER");
    prismaMock.staff.findMany.mockResolvedValue(STAFF_FIXTURE as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });

  it("returns staff list for FINANCE", async () => {
    mockSession("FINANCE");
    prismaMock.staff.findMany.mockResolvedValue(STAFF_FIXTURE as never);

    const res = await GET();
    expect(res.status).toBe(200);
  });
});

// ─── POST create staff ─────────────────────────────────────────────────────

describe("POST /api/admin/staff — role guard", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/staff", "POST", { name: "Гид", role: "guide" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/staff", "POST", { name: "Гид", role: "guide" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 403 for FINANCE", async () => {
    mockSession("FINANCE");
    const req = makeRequest("/api/admin/staff", "POST", { name: "Гид", role: "guide" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/staff — validation", () => {
  it("returns 400 when name is missing", async () => {
    mockSession("ADMIN");
    const req = makeRequest("/api/admin/staff", "POST", { role: "guide" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when role is missing", async () => {
    mockSession("ADMIN");
    const req = makeRequest("/api/admin/staff", "POST", { name: "Акылбек" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/staff — creation", () => {
  it("creates staff and returns 201 for ADMIN", async () => {
    mockSession("ADMIN");
    prismaMock.staff.create.mockResolvedValue(STAFF_FIXTURE[0] as never);

    const req = makeRequest("/api/admin/staff", "POST", { name: "Акылбек", role: "guide", phone: "+996700111" });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.role).toBe("guide");
  });

  it("creates staff for SENIOR_MANAGER", async () => {
    mockSession("SENIOR_MANAGER");
    prismaMock.staff.create.mockResolvedValue(STAFF_FIXTURE[1] as never);

    const req = makeRequest("/api/admin/staff", "POST", { name: "Бакыт", role: "driver" });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

// ─── DELETE staff ──────────────────────────────────────────────────────────

describe("DELETE /api/admin/staff/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await DELETE(makeRequest("/api/admin/staff/s-1", "DELETE"), makeParams({ id: "s-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER", async () => {
    mockSession("MANAGER");
    const res = await DELETE(makeRequest("/api/admin/staff/s-1", "DELETE"), makeParams({ id: "s-1" }));
    expect(res.status).toBe(403);
  });

  it("deletes staff for ADMIN and returns ok", async () => {
    mockSession("ADMIN");
    prismaMock.staff.delete.mockResolvedValue(STAFF_FIXTURE[0] as never);

    const res = await DELETE(makeRequest("/api/admin/staff/s-1", "DELETE"), makeParams({ id: "s-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
