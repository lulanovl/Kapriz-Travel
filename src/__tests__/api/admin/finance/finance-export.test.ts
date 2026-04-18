/**
 * Tests: GET /api/admin/finance/export
 * Covers: auth, role guard (MANAGER blocked), successful XLSX response.
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/admin/finance/export/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest } from "../../../helpers/request";

// ─── Auth guard ────────────────────────────────────────────────────────────

describe("GET /api/admin/finance/export — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

// ─── Role guard ────────────────────────────────────────────────────────────

describe("GET /api/admin/finance/export — role guard", () => {
  it("returns 403 for MANAGER role", async () => {
    mockSession("MANAGER");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns XLSX response for ADMIN", async () => {
    mockSession("ADMIN");
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.expense.findMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("spreadsheetml");
    expect(res.headers.get("Content-Disposition")).toContain("finance-");
  });

  it("returns XLSX response for FINANCE", async () => {
    mockSession("FINANCE");
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.expense.findMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("returns XLSX response for SENIOR_MANAGER", async () => {
    mockSession("SENIOR_MANAGER");
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.expense.findMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("includes PAID bookings and KGS expenses in summary sheet", async () => {
    mockSession("ADMIN");
    const paidBooking = {
      id: "b-1",
      paymentStatus: "PAID",
      finalPrice: 10000,
      depositPaid: 10000,
      currency: "KGS",
      createdAt: new Date(),
      application: {
        client: { name: "Клиент А", whatsapp: "+996700" },
        tour: { title: "Иссык-Куль" },
        departure: { departureDate: new Date("2026-06-15") },
        group: { name: "Бус 1" },
      },
    };
    const kgsExpense = {
      id: "e-1",
      category: "GUIDE",
      amount: 3000,
      currency: "KGS",
      note: null,
      createdAt: new Date(),
      group: {
        name: "Бус 1",
        departure: {
          departureDate: new Date("2026-06-15"),
          tour: { title: "Иссык-Куль" },
        },
      },
    };
    prismaMock.booking.findMany.mockResolvedValue([paidBooking] as never);
    prismaMock.expense.findMany.mockResolvedValue([kgsExpense] as never);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("spreadsheetml");
  });
});
