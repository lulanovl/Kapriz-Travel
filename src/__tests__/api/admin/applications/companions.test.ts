/**
 * Tests: POST /api/admin/applications/[id]/companions
 *        DELETE /api/admin/companions/[id]
 * Covers: auth, validation, create/delete companion.
 */
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/admin/applications/[id]/companions/route";
import { DELETE } from "@/app/api/admin/companions/[id]/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const COMPANION_FIXTURE = {
  id: "comp-1",
  applicationId: "app-1",
  name: "Айгуль Иванова",
  whatsapp: "+996700999",
};

// ─── POST companion ────────────────────────────────────────────────────────

describe("POST /api/admin/applications/[id]/companions — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/applications/app-1/companions", "POST", { name: "Айгуль" });
    const res = await POST(req, makeParams({ id: "app-1" }));
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/applications/[id]/companions — validation", () => {
  it("returns 400 when name is empty", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/applications/app-1/companions", "POST", { name: "" });
    const res = await POST(req, makeParams({ id: "app-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when name is missing", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/applications/app-1/companions", "POST", {});
    const res = await POST(req, makeParams({ id: "app-1" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/admin/applications/[id]/companions — creation", () => {
  it("creates companion and returns 201", async () => {
    mockSession("MANAGER");
    prismaMock.companion.create.mockResolvedValue(COMPANION_FIXTURE as never);

    const req = makeRequest("/api/admin/applications/app-1/companions", "POST", {
      name: "Айгуль Иванова",
      whatsapp: "+996700999",
    });
    const res = await POST(req, makeParams({ id: "app-1" }));

    expect(res.status).toBe(201);
    expect(prismaMock.companion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          applicationId: "app-1",
          name: "Айгуль Иванова",
        }),
      })
    );
  });

  it("saves null whatsapp when not provided", async () => {
    mockSession("ADMIN");
    prismaMock.companion.create.mockResolvedValue({ ...COMPANION_FIXTURE, whatsapp: null } as never);

    const req = makeRequest("/api/admin/applications/app-1/companions", "POST", { name: "Без номера" });
    await POST(req, makeParams({ id: "app-1" }));

    expect(prismaMock.companion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ whatsapp: null }),
      })
    );
  });
});

// ─── DELETE companion ──────────────────────────────────────────────────────

describe("DELETE /api/admin/companions/[id] — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await DELETE(
      makeRequest("/api/admin/companions/comp-1", "DELETE"),
      makeParams({ id: "comp-1" })
    );
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/admin/companions/[id] — deletion", () => {
  it("deletes companion and returns ok for any role", async () => {
    mockSession("MANAGER");
    prismaMock.companion.delete.mockResolvedValue(COMPANION_FIXTURE as never);

    const res = await DELETE(
      makeRequest("/api/admin/companions/comp-1", "DELETE"),
      makeParams({ id: "comp-1" })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(prismaMock.companion.delete).toHaveBeenCalledWith({ where: { id: "comp-1" } });
  });
});
