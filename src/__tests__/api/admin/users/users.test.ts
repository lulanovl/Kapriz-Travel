/**
 * Tests: GET + POST /api/admin/users
 * Covers: ADMIN-only guard, list, create, email uniqueness check.
 */
import { describe, it, expect } from "vitest";
import { GET, POST } from "@/app/api/admin/users/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest } from "../../../helpers/request";

const USERS_FIXTURE = [
  {
    id: "u-1",
    name: "Admin User",
    email: "admin@test.kg",
    role: "ADMIN",
    telegramChatId: null,
    createdAt: new Date(),
    _count: { applications: 0 },
  },
];

const NEW_USER_BODY = {
  name: "Новый Менеджер",
  email: "newmanager@test.kg",
  password: "secure123",
  role: "MANAGER",
};

// ─── GET — auth & role guard ───────────────────────────────────────────────

describe("GET /api/admin/users — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 403 for SENIOR_MANAGER role", async () => {
    mockSession("SENIOR_MANAGER");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 403 for FINANCE role", async () => {
    mockSession("FINANCE");
    const res = await GET();
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/users — ADMIN only", () => {
  it("returns users list for ADMIN", async () => {
    mockSession("ADMIN");
    prismaMock.user.findMany.mockResolvedValue(USERS_FIXTURE as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].email).toBe("admin@test.kg");
  });
});

// ─── POST — create user ────────────────────────────────────────────────────

describe("POST /api/admin/users — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/users", "POST", NEW_USER_BODY);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/users", "POST", NEW_USER_BODY);
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/users — validation", () => {
  it("returns 400 when name is missing", async () => {
    mockSession("ADMIN");
    const req = makeRequest("/api/admin/users", "POST", { ...NEW_USER_BODY, name: undefined });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    mockSession("ADMIN");
    const req = makeRequest("/api/admin/users", "POST", { ...NEW_USER_BODY, password: undefined });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 409 when email already exists", async () => {
    mockSession("ADMIN");
    prismaMock.user.findUnique.mockResolvedValue(USERS_FIXTURE[0] as never);

    const req = makeRequest("/api/admin/users", "POST", NEW_USER_BODY);
    const res = await POST(req);
    expect(res.status).toBe(409);
  });
});

describe("POST /api/admin/users — creation", () => {
  it("creates user and returns 201", async () => {
    mockSession("ADMIN");
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "u-new",
      name: "Новый Менеджер",
      email: "newmanager@test.kg",
      role: "MANAGER",
      createdAt: new Date(),
    } as never);

    const req = makeRequest("/api/admin/users", "POST", NEW_USER_BODY);
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.email).toBe("newmanager@test.kg");
  });

  it("defaults role to MANAGER when role not specified", async () => {
    mockSession("ADMIN");
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "u-new",
      name: "Test",
      email: "t@test.kg",
      role: "MANAGER",
      createdAt: new Date(),
    } as never);

    const req = makeRequest("/api/admin/users", "POST", {
      name: "Test",
      email: "t@test.kg",
      password: "pass1234",
    });
    await POST(req);

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "MANAGER" }),
      })
    );
  });
});
