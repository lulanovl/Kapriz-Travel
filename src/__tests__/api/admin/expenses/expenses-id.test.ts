/**
 * Tests: DELETE /api/admin/expenses/[id]
 *        DELETE /api/admin/extra-expenses/[id]
 * Covers: auth, role guard (MANAGER blocked), successful delete.
 */
import { describe, it, expect } from "vitest";
import { DELETE as DELETE_EXPENSE } from "@/app/api/admin/expenses/[id]/route";
import { DELETE as DELETE_EXTRA } from "@/app/api/admin/extra-expenses/[id]/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const EXPENSE_FIXTURE = {
  id: "exp-1",
  groupId: "group-1",
  category: "GUIDE",
  amount: 5000,
  currency: "KGS",
  note: null,
  createdAt: new Date(),
};

const EXTRA_FIXTURE = {
  id: "ee-1",
  departureId: "dep-1",
  amount: 1000,
  currency: "KGS",
  description: "Реклама",
  createdAt: new Date(),
};

// ─── DELETE /api/admin/expenses/[id] ──────────────────────────────────────

describe("DELETE /api/admin/expenses/[id] — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await DELETE_EXPENSE(
      makeRequest("/api/admin/expenses/exp-1", "DELETE"),
      makeParams({ id: "exp-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const res = await DELETE_EXPENSE(
      makeRequest("/api/admin/expenses/exp-1", "DELETE"),
      makeParams({ id: "exp-1" })
    );
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/expenses/[id] — deletion", () => {
  it("deletes expense and returns ok for FINANCE", async () => {
    mockSession("FINANCE");
    prismaMock.expense.delete.mockResolvedValue(EXPENSE_FIXTURE as never);

    const res = await DELETE_EXPENSE(
      makeRequest("/api/admin/expenses/exp-1", "DELETE"),
      makeParams({ id: "exp-1" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(prismaMock.expense.delete).toHaveBeenCalledWith({ where: { id: "exp-1" } });
  });

  it("deletes expense for ADMIN", async () => {
    mockSession("ADMIN");
    prismaMock.expense.delete.mockResolvedValue(EXPENSE_FIXTURE as never);

    const res = await DELETE_EXPENSE(
      makeRequest("/api/admin/expenses/exp-1", "DELETE"),
      makeParams({ id: "exp-1" })
    );
    expect(res.status).toBe(200);
  });
});

// ─── DELETE /api/admin/extra-expenses/[id] ────────────────────────────────

describe("DELETE /api/admin/extra-expenses/[id] — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await DELETE_EXTRA(
      makeRequest("/api/admin/extra-expenses/ee-1", "DELETE"),
      makeParams({ id: "ee-1" })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const res = await DELETE_EXTRA(
      makeRequest("/api/admin/extra-expenses/ee-1", "DELETE"),
      makeParams({ id: "ee-1" })
    );
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/extra-expenses/[id] — deletion", () => {
  it("returns 404 when extra expense not found", async () => {
    mockSession("ADMIN");
    prismaMock.extraExpense.findUnique.mockResolvedValue(null);

    const res = await DELETE_EXTRA(
      makeRequest("/api/admin/extra-expenses/nope", "DELETE"),
      makeParams({ id: "nope" })
    );
    expect(res.status).toBe(404);
  });

  it("deletes extra expense and returns ok for FINANCE", async () => {
    mockSession("FINANCE");
    prismaMock.extraExpense.findUnique.mockResolvedValue(EXTRA_FIXTURE as never);
    prismaMock.extraExpense.delete.mockResolvedValue(EXTRA_FIXTURE as never);

    const res = await DELETE_EXTRA(
      makeRequest("/api/admin/extra-expenses/ee-1", "DELETE"),
      makeParams({ id: "ee-1" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(prismaMock.extraExpense.delete).toHaveBeenCalledWith({ where: { id: "ee-1" } });
  });
});
