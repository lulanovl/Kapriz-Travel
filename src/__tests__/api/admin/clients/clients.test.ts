/**
 * Tests: GET /api/admin/clients
 * Covers: auth guard, search filter applied vs. not applied.
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/admin/clients/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest } from "../../../helpers/request";

const CLIENTS_FIXTURE = [
  { id: "c-1", name: "Иван Иванов", whatsapp: "+996700111", country: "KG", createdAt: new Date(), _count: { applications: 3 } },
  { id: "c-2", name: "Maria Smith", whatsapp: "+79001234567", country: "RU", createdAt: new Date(), _count: { applications: 1 } },
];

describe("GET /api/admin/clients — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET(makeRequest("/api/admin/clients"));
    expect(res.status).toBe(401);
  });
});

describe("GET /api/admin/clients — all roles can access", () => {
  for (const role of ["ADMIN", "SENIOR_MANAGER", "MANAGER", "FINANCE"] as const) {
    it(`returns 200 for ${role}`, async () => {
      mockSession(role);
      prismaMock.client.findMany.mockResolvedValue(CLIENTS_FIXTURE as never);
      const res = await GET(makeRequest("/api/admin/clients"));
      expect(res.status).toBe(200);
    });
  }
});

describe("GET /api/admin/clients — search query", () => {
  it("passes search filter to prisma when ?q= is provided", async () => {
    mockSession("MANAGER");
    prismaMock.client.findMany.mockResolvedValue([CLIENTS_FIXTURE[0]] as never);

    const res = await GET(makeRequest("/api/admin/clients?q=Иван"));
    expect(res.status).toBe(200);

    expect(prismaMock.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ OR: expect.any(Array) }),
      })
    );
  });

  it("passes no where filter when ?q= is empty", async () => {
    mockSession("MANAGER");
    prismaMock.client.findMany.mockResolvedValue(CLIENTS_FIXTURE as never);

    await GET(makeRequest("/api/admin/clients"));

    expect(prismaMock.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined })
    );
  });

  it("returns matching clients array", async () => {
    mockSession("ADMIN");
    prismaMock.client.findMany.mockResolvedValue([CLIENTS_FIXTURE[0]] as never);

    const res = await GET(makeRequest("/api/admin/clients?q=Иван"));
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Иван Иванов");
  });
});
