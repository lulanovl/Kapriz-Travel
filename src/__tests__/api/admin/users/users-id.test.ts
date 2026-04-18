/**
 * Tests: PATCH + DELETE /api/admin/users/[id]
 * Covers: ADMIN-only guard, self-delete prevention, optional password update.
 */
import { describe, it, expect } from "vitest";
import { PATCH, DELETE } from "@/app/api/admin/users/[id]/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const USER_FIXTURE = {
  id: "u-target",
  name: "Менеджер",
  email: "manager@test.kg",
  role: "MANAGER",
  createdAt: new Date(),
};

// ─── PATCH — update user ───────────────────────────────────────────────────

describe("PATCH /api/admin/users/[id] — auth and role", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/users/u-target", "PATCH", { name: "New Name" });
    const res = await PATCH(req, makeParams({ id: "u-target" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/users/u-target", "PATCH", { name: "New Name" });
    const res = await PATCH(req, makeParams({ id: "u-target" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for SENIOR_MANAGER role", async () => {
    mockSession("SENIOR_MANAGER");
    const req = makeRequest("/api/admin/users/u-target", "PATCH", { role: "FINANCE" });
    const res = await PATCH(req, makeParams({ id: "u-target" }));
    expect(res.status).toBe(403);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const req = makeRequest("/api/admin/users/u-target", "PATCH", { name: "x" });
    const res = await PATCH(req, makeParams({ id: "u-target" }));
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/admin/users/[id] — ADMIN updates", () => {
  it("updates name and role for ADMIN", async () => {
    mockSession("ADMIN");
    prismaMock.user.update.mockResolvedValue({ ...USER_FIXTURE, role: "SENIOR_MANAGER" } as never);

    const req = makeRequest("/api/admin/users/u-target", "PATCH", { name: "Новое Имя", role: "SENIOR_MANAGER" });
    const res = await PATCH(req, makeParams({ id: "u-target" }));

    expect(res.status).toBe(200);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u-target" },
        data: expect.objectContaining({ name: "Новое Имя", role: "SENIOR_MANAGER" }),
      })
    );
  });

  it("hashes and updates password when provided", async () => {
    mockSession("ADMIN");
    prismaMock.user.update.mockResolvedValue(USER_FIXTURE as never);

    const req = makeRequest("/api/admin/users/u-target", "PATCH", { password: "newpassword123" });
    await PATCH(req, makeParams({ id: "u-target" }));

    const callData = (prismaMock.user.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    // Password should be hashed (starts with $2b$)
    expect(callData.password).toMatch(/^\$2b\$/);
  });

  it("does NOT update password when password field is absent", async () => {
    mockSession("ADMIN");
    prismaMock.user.update.mockResolvedValue(USER_FIXTURE as never);

    const req = makeRequest("/api/admin/users/u-target", "PATCH", { name: "Only Name" });
    await PATCH(req, makeParams({ id: "u-target" }));

    const callData = (prismaMock.user.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(callData).not.toHaveProperty("password");
  });
});

// ─── DELETE — remove user ──────────────────────────────────────────────────

describe("DELETE /api/admin/users/[id] — auth and role", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await DELETE(makeRequest("/api/admin/users/u-target", "DELETE"), makeParams({ id: "u-target" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const res = await DELETE(makeRequest("/api/admin/users/u-target", "DELETE"), makeParams({ id: "u-target" }));
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/users/[id] — self-delete prevention", () => {
  it("returns 400 when ADMIN tries to delete themselves", async () => {
    mockSession("ADMIN", "user-admin");
    const res = await DELETE(
      makeRequest("/api/admin/users/user-admin", "DELETE"),
      makeParams({ id: "user-admin" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/нельзя удалить себя/i);
  });

  it("deletes a different user when ADMIN", async () => {
    mockSession("ADMIN", "user-admin");
    prismaMock.user.delete.mockResolvedValue(USER_FIXTURE as never);

    const res = await DELETE(
      makeRequest("/api/admin/users/u-target", "DELETE"),
      makeParams({ id: "u-target" })
    );
    expect(res.status).toBe(200);
    expect(prismaMock.user.delete).toHaveBeenCalledWith({ where: { id: "u-target" } });
  });
});
