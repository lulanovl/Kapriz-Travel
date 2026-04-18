/**
 * Tests: POST /api/admin/extra-expenses
 * Covers: auth, role guard (MANAGER blocked), validation,
 *         departure existence check (404), successful creation.
 */
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/admin/extra-expenses/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest } from "../../../helpers/request";

const EXPENSE_FIXTURE = {
  id: "ee-1",
  departureId: "dep-1",
  amount: 5000,
  currency: "KGS",
  description: "Реклама",
  createdAt: new Date(),
};

const DEPARTURE_FIXTURE = { id: "dep-1" };

// ─── Auth guard ────────────────────────────────────────────────────────────

describe("POST /api/admin/extra-expenses — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await POST(makeRequest("/api/admin/extra-expenses", "POST", { departureId: "dep-1", amount: 5000 }));
    expect(res.status).toBe(401);
  });
});

// ─── Role guard ────────────────────────────────────────────────────────────

describe("POST /api/admin/extra-expenses — role guard", () => {
  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const res = await POST(makeRequest("/api/admin/extra-expenses", "POST", { departureId: "dep-1", amount: 5000 }));
    expect(res.status).toBe(403);
  });

  it("returns 200 for FINANCE role", async () => {
    mockSession("FINANCE");
    prismaMock.departure.findUnique.mockResolvedValue(DEPARTURE_FIXTURE as never);
    prismaMock.extraExpense.create.mockResolvedValue(EXPENSE_FIXTURE as never);

    const res = await POST(makeRequest("/api/admin/extra-expenses", "POST", { departureId: "dep-1", amount: 5000 }));
    expect(res.status).toBe(201);
  });

  it("returns 201 for SENIOR_MANAGER role", async () => {
    mockSession("SENIOR_MANAGER");
    prismaMock.departure.findUnique.mockResolvedValue(DEPARTURE_FIXTURE as never);
    prismaMock.extraExpense.create.mockResolvedValue(EXPENSE_FIXTURE as never);

    const res = await POST(makeRequest("/api/admin/extra-expenses", "POST", { departureId: "dep-1", amount: 5000 }));
    expect(res.status).toBe(201);
  });
});

// ─── Validation ────────────────────────────────────────────────────────────

describe("POST /api/admin/extra-expenses — validation", () => {
  it("returns 400 when departureId is missing", async () => {
    mockSession("ADMIN");
    const res = await POST(makeRequest("/api/admin/extra-expenses", "POST", { amount: 5000 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is missing", async () => {
    mockSession("ADMIN");
    const res = await POST(makeRequest("/api/admin/extra-expenses", "POST", { departureId: "dep-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is zero", async () => {
    mockSession("ADMIN");
    const res = await POST(makeRequest("/api/admin/extra-expenses", "POST", { departureId: "dep-1", amount: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is negative", async () => {
    mockSession("ADMIN");
    const res = await POST(makeRequest("/api/admin/extra-expenses", "POST", { departureId: "dep-1", amount: -100 }));
    expect(res.status).toBe(400);
  });
});

// ─── Departure existence ───────────────────────────────────────────────────

describe("POST /api/admin/extra-expenses — departure check", () => {
  it("returns 404 when departure not found", async () => {
    mockSession("ADMIN");
    prismaMock.departure.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest("/api/admin/extra-expenses", "POST", { departureId: "nope", amount: 5000 }));
    expect(res.status).toBe(404);
  });
});

// ─── Creation ─────────────────────────────────────────────────────────────

describe("POST /api/admin/extra-expenses — creation", () => {
  it("creates expense and returns 201 for ADMIN", async () => {
    mockSession("ADMIN");
    prismaMock.departure.findUnique.mockResolvedValue(DEPARTURE_FIXTURE as never);
    prismaMock.extraExpense.create.mockResolvedValue(EXPENSE_FIXTURE as never);

    const res = await POST(makeRequest("/api/admin/extra-expenses", "POST", {
      departureId: "dep-1",
      amount: 5000,
      currency: "KGS",
      description: "Реклама",
    }));

    expect(res.status).toBe(201);
    expect(prismaMock.extraExpense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ departureId: "dep-1", amount: 5000 }),
      })
    );
  });

  it("defaults currency to KGS when not provided", async () => {
    mockSession("ADMIN");
    prismaMock.departure.findUnique.mockResolvedValue(DEPARTURE_FIXTURE as never);
    prismaMock.extraExpense.create.mockResolvedValue(EXPENSE_FIXTURE as never);

    await POST(makeRequest("/api/admin/extra-expenses", "POST", { departureId: "dep-1", amount: 3000 }));

    expect(prismaMock.extraExpense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currency: "KGS" }),
      })
    );
  });
});
