/**
 * Tests: POST /api/admin/applications/[id]/booking
 * Covers: auth, create booking, update booking, price history log,
 *         auto-status DEPOSIT when depositPaid > 0.
 */
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/admin/applications/[id]/booking/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest, makeParams } from "../../../helpers/request";

const PARAMS = makeParams({ id: "app-1" });

const APP_FIXTURE = {
  id: "app-1",
  status: "NEW",
  managerId: null,
  tour: { basePrice: 5000 },
};

const BOOKING_FIXTURE = {
  id: "booking-1",
  applicationId: "app-1",
  basePrice: 5000,
  finalPrice: 5000,
  priceChangeReason: null,
  currency: "KGS",
  depositPaid: 0,
  depositDate: null,
  paymentStatus: "PENDING",
  guidePaymentStatus: "PENDING",
  noShow: false,
};

// ─── Auth guard ────────────────────────────────────────────────────────────

describe("POST /api/admin/applications/[id]/booking — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/applications/app-1/booking", "POST", { finalPrice: 5000 });
    const res = await POST(req, PARAMS);
    expect(res.status).toBe(401);
  });
});

// ─── Create booking ────────────────────────────────────────────────────────

describe("POST /api/admin/applications/[id]/booking — create", () => {
  it("creates booking with basePrice from tour when no existing booking", async () => {
    mockSession("MANAGER");
    prismaMock.booking.findUnique.mockResolvedValue(null);
    prismaMock.application.findUnique.mockResolvedValue(APP_FIXTURE as never);
    prismaMock.booking.create.mockResolvedValue(BOOKING_FIXTURE as never);

    const req = makeRequest("/api/admin/applications/app-1/booking", "POST", { finalPrice: 5000, depositPaid: 0 });
    const res = await POST(req, PARAMS);

    expect(res.status).toBe(200);
    expect(prismaMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ basePrice: 5000, applicationId: "app-1" }),
      })
    );
  });

  it("returns 404 when application does not exist on create", async () => {
    mockSession("MANAGER");
    prismaMock.booking.findUnique.mockResolvedValue(null);
    prismaMock.application.findUnique.mockResolvedValue(null);

    const req = makeRequest("/api/admin/applications/nope/booking", "POST", {});
    const res = await POST(req, makeParams({ id: "nope" }));
    expect(res.status).toBe(404);
  });
});

// ─── Auto-status DEPOSIT ───────────────────────────────────────────────────

describe("POST /api/admin/applications/[id]/booking — auto DEPOSIT status", () => {
  it("advances status to DEPOSIT when depositPaid > 0 and status is NEW", async () => {
    mockSession("MANAGER");
    prismaMock.booking.findUnique.mockResolvedValue(null);
    prismaMock.application.findUnique.mockResolvedValue({ ...APP_FIXTURE, status: "NEW" } as never);
    prismaMock.booking.create.mockResolvedValue({ ...BOOKING_FIXTURE, depositPaid: 2000 } as never);

    const req = makeRequest("/api/admin/applications/app-1/booking", "POST", { depositPaid: 2000 });
    await POST(req, PARAMS);

    expect(prismaMock.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app-1" },
        data: { status: "DEPOSIT" },
      })
    );
  });

  it("does NOT advance status when depositPaid is 0", async () => {
    mockSession("MANAGER");
    prismaMock.booking.findUnique.mockResolvedValue(null);
    prismaMock.application.findUnique.mockResolvedValue(APP_FIXTURE as never);
    prismaMock.booking.create.mockResolvedValue(BOOKING_FIXTURE as never);

    const req = makeRequest("/api/admin/applications/app-1/booking", "POST", { depositPaid: 0 });
    await POST(req, PARAMS);

    expect(prismaMock.application.update).not.toHaveBeenCalled();
  });

  it("does NOT advance status when already past PROPOSAL", async () => {
    mockSession("MANAGER");
    prismaMock.booking.findUnique.mockResolvedValue(null);
    prismaMock.application.findUnique.mockResolvedValue({ ...APP_FIXTURE, status: "DEPOSIT" } as never);
    prismaMock.booking.create.mockResolvedValue({ ...BOOKING_FIXTURE, depositPaid: 3000 } as never);

    const req = makeRequest("/api/admin/applications/app-1/booking", "POST", { depositPaid: 3000 });
    await POST(req, PARAMS);

    expect(prismaMock.application.update).not.toHaveBeenCalled();
  });
});

// ─── Update booking + price history ───────────────────────────────────────

describe("POST /api/admin/applications/[id]/booking — update", () => {
  it("updates existing booking when one exists", async () => {
    mockSession("MANAGER", "user-manager");
    prismaMock.booking.findUnique.mockResolvedValue(BOOKING_FIXTURE as never);
    prismaMock.booking.update.mockResolvedValue({ ...BOOKING_FIXTURE, finalPrice: 4500 } as never);

    const req = makeRequest("/api/admin/applications/app-1/booking", "POST", { finalPrice: 4500 });
    const res = await POST(req, PARAMS);

    expect(res.status).toBe(200);
    expect(prismaMock.booking.update).toHaveBeenCalled();
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it("logs price change to price_history when finalPrice changes", async () => {
    mockSession("MANAGER", "user-manager");
    prismaMock.booking.findUnique.mockResolvedValue({ ...BOOKING_FIXTURE, finalPrice: 5000 } as never);
    prismaMock.booking.update.mockResolvedValue({ ...BOOKING_FIXTURE, finalPrice: 4000 } as never);

    const req = makeRequest("/api/admin/applications/app-1/booking", "POST", {
      finalPrice: 4000,
      priceChangeReason: "скидка",
    });
    await POST(req, PARAMS);

    expect(prismaMock.priceHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookingId: "booking-1",
          oldPrice: 5000,
          newPrice: 4000,
          reason: "скидка",
        }),
      })
    );
  });

  it("does NOT log price history when finalPrice is unchanged", async () => {
    mockSession("MANAGER");
    prismaMock.booking.findUnique.mockResolvedValue({ ...BOOKING_FIXTURE, finalPrice: 5000 } as never);
    prismaMock.booking.update.mockResolvedValue(BOOKING_FIXTURE as never);

    const req = makeRequest("/api/admin/applications/app-1/booking", "POST", { finalPrice: 5000 });
    await POST(req, PARAMS);

    expect(prismaMock.priceHistory.create).not.toHaveBeenCalled();
  });

  it("advances status to DEPOSIT when updating existing booking with depositPaid > 0", async () => {
    mockSession("MANAGER");
    prismaMock.booking.findUnique.mockResolvedValue(BOOKING_FIXTURE as never);
    prismaMock.booking.update.mockResolvedValue({ ...BOOKING_FIXTURE, depositPaid: 3000 } as never);
    prismaMock.application.findUnique.mockResolvedValue({ id: "app-1", status: "PROPOSAL" } as never);
    prismaMock.application.update.mockResolvedValue({} as never);

    const req = makeRequest("/api/admin/applications/app-1/booking", "POST", { depositPaid: 3000 });
    await POST(req, PARAMS);

    expect(prismaMock.application.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "DEPOSIT" } })
    );
  });
});
