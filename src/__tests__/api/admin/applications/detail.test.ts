/**
 * Tests: GET + PATCH /api/admin/applications/[id]
 * Covers: auth, 404, MANAGER forbidden on other's application,
 *         partial update, status change.
 */
import { describe, it, expect } from "vitest";
import { GET, PATCH } from "@/app/api/admin/applications/[id]/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const APP_FIXTURE = {
  id: "app-1",
  managerId: "user-manager",
  status: "NEW",
  persons: 2,
  comment: null,
  departureId: null,
  groupId: null,
  client: { id: "c-1", name: "Иван", whatsapp: "+996700", country: "KG", city: null, tag: null, source: null, notes: null, noShow: false, createdAt: new Date() },
  tour: { id: "t-1", title: "Иссык-Куль", basePrice: 5000, slug: "issyk-kul" },
  departure: null,
  group: null,
  manager: { id: "user-manager", name: "Manager", email: "m@test.kg" },
  booking: null,
  reminders: [],
  createdAt: new Date(),
};

// ─── GET — auth & access ───────────────────────────────────────────────────

describe("GET /api/admin/applications/[id] — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(makeRequest("/api/admin/applications/app-1"), makeParams({ id: "app-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when application does not exist", async () => {
    mockSession("ADMIN");
    prismaMock.application.findUnique.mockResolvedValue(null);

    const res = await GET(makeRequest("/api/admin/applications/nope"), makeParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/admin/applications/[id] — role access", () => {
  it("ADMIN can read any application", async () => {
    mockSession("ADMIN");
    prismaMock.application.findUnique.mockResolvedValue(APP_FIXTURE as never);

    const res = await GET(makeRequest("/api/admin/applications/app-1"), makeParams({ id: "app-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("app-1");
  });

  it("MANAGER can read own application", async () => {
    mockSession("MANAGER", "user-manager");
    prismaMock.application.findUnique.mockResolvedValue(APP_FIXTURE as never);

    const res = await GET(makeRequest("/api/admin/applications/app-1"), makeParams({ id: "app-1" }));
    expect(res.status).toBe(200);
  });

  it("MANAGER gets 403 on another manager's application", async () => {
    mockSession("MANAGER", "user-OTHER");
    prismaMock.application.findUnique.mockResolvedValue(APP_FIXTURE as never); // managerId = "user-manager"

    const res = await GET(makeRequest("/api/admin/applications/app-1"), makeParams({ id: "app-1" }));
    expect(res.status).toBe(403);
  });

  it("SENIOR_MANAGER can read any application", async () => {
    mockSession("SENIOR_MANAGER", "user-senior");
    prismaMock.application.findUnique.mockResolvedValue(APP_FIXTURE as never);

    const res = await GET(makeRequest("/api/admin/applications/app-1"), makeParams({ id: "app-1" }));
    expect(res.status).toBe(200);
  });
});

// ─── PATCH — update ────────────────────────────────────────────────────────

describe("PATCH /api/admin/applications/[id] — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/applications/app-1", "PATCH", { status: "CONTACT" });
    const res = await PATCH(req, makeParams({ id: "app-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 404 when application not found", async () => {
    mockSession("ADMIN");
    prismaMock.application.findUnique.mockResolvedValue(null);

    const req = makeRequest("/api/admin/applications/nope", "PATCH", { status: "CONTACT" });
    const res = await PATCH(req, makeParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/applications/[id] — role access", () => {
  const UPDATED_APP = { ...APP_FIXTURE, status: "CONTACT", client: APP_FIXTURE.client, tour: APP_FIXTURE.tour, departure: null, group: null, manager: APP_FIXTURE.manager };

  it("MANAGER gets 403 when patching another manager's application", async () => {
    mockSession("MANAGER", "user-OTHER");
    prismaMock.application.findUnique.mockResolvedValue({ managerId: "user-manager" } as never);

    const req = makeRequest("/api/admin/applications/app-1", "PATCH", { status: "CONTACT" });
    const res = await PATCH(req, makeParams({ id: "app-1" }));
    expect(res.status).toBe(403);
  });

  it("MANAGER can patch own application", async () => {
    mockSession("MANAGER", "user-manager");
    prismaMock.application.findUnique.mockResolvedValue({ managerId: "user-manager" } as never);
    prismaMock.application.update.mockResolvedValue(UPDATED_APP as never);

    const req = makeRequest("/api/admin/applications/app-1", "PATCH", { status: "CONTACT" });
    const res = await PATCH(req, makeParams({ id: "app-1" }));
    expect(res.status).toBe(200);
  });

  it("ADMIN can patch any application", async () => {
    mockSession("ADMIN");
    prismaMock.application.findUnique.mockResolvedValue({ managerId: "user-manager" } as never);
    prismaMock.application.update.mockResolvedValue(UPDATED_APP as never);

    const req = makeRequest("/api/admin/applications/app-1", "PATCH", { status: "ARCHIVE" });
    const res = await PATCH(req, makeParams({ id: "app-1" }));
    expect(res.status).toBe(200);
  });

  it("updates only provided fields (partial update)", async () => {
    mockSession("ADMIN");
    prismaMock.application.findUnique.mockResolvedValue({ managerId: null } as never);
    prismaMock.application.update.mockResolvedValue(UPDATED_APP as never);

    const req = makeRequest("/api/admin/applications/app-1", "PATCH", { comment: "Перезвонить завтра" });
    await PATCH(req, makeParams({ id: "app-1" }));

    expect(prismaMock.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ comment: "Перезвонить завтра" }),
      })
    );
    // status was NOT passed, so it should NOT appear in data
    const callArg = (prismaMock.application.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg.data).not.toHaveProperty("status");
  });

  it("updates managerId, persons, departureId, groupId when provided", async () => {
    mockSession("ADMIN");
    prismaMock.application.findUnique.mockResolvedValue({ managerId: null } as never);
    prismaMock.application.update.mockResolvedValue(APP_FIXTURE as never);

    const req = makeRequest("/api/admin/applications/app-1", "PATCH", {
      managerId: "user-1",
      persons: 3,
      departureId: "dep-1",
      groupId: "group-1",
    });
    await PATCH(req, makeParams({ id: "app-1" }));

    expect(prismaMock.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          managerId: "user-1",
          persons: 3,
          departureId: "dep-1",
          groupId: "group-1",
        }),
      })
    );
  });
});
