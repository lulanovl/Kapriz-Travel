/**
 * Tests: PATCH /api/guide/[token]/payment
 * Public endpoint — auth via token, not CRM session.
 * Covers: invalid token, expired token, wrong group, all 4 statuses,
 *         booking paymentStatus sync, application status sync.
 */
import { describe, it, expect } from "vitest";
import { PATCH } from "@/app/api/guide/[token]/payment/route";
import { prismaMock } from "../../helpers/prisma";
import { makeRequest, makeParams } from "../../helpers/request";

const VALID_TOKEN = "valid-token-abc";
const TOKEN_PARAMS = makeParams({ token: VALID_TOKEN });

const TOKEN_FIXTURE = {
  id: "gt-1",
  token: VALID_TOKEN,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h from now
  groupId: "group-1",
  group: { id: "group-1" },
};

const APP_FIXTURE = {
  id: "app-1",
  groupId: "group-1",
  status: "IN_BUS",
};

// ─── Token validation ──────────────────────────────────────────────────────

describe("PATCH /api/guide/[token]/payment — token validation", () => {
  it("returns 401 when token does not exist", async () => {
    prismaMock.guideToken.findUnique.mockResolvedValue(null);

    const req = makeRequest(`/api/guide/bad-token/payment`, "PATCH", {
      applicationId: "app-1",
      status: "PAID",
    });
    const res = await PATCH(req, makeParams({ token: "bad-token" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is expired", async () => {
    prismaMock.guideToken.findUnique.mockResolvedValue({
      ...TOKEN_FIXTURE,
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    } as never);

    const req = makeRequest(`/api/guide/${VALID_TOKEN}/payment`, "PATCH", {
      applicationId: "app-1",
      status: "PAID",
    });
    const res = await PATCH(req, TOKEN_PARAMS);
    expect(res.status).toBe(401);
  });
});

// ─── Input validation ──────────────────────────────────────────────────────

describe("PATCH /api/guide/[token]/payment — input validation", () => {
  it("returns 400 when status is invalid", async () => {
    prismaMock.guideToken.findUnique.mockResolvedValue(TOKEN_FIXTURE as never);

    const req = makeRequest(`/api/guide/${VALID_TOKEN}/payment`, "PATCH", {
      applicationId: "app-1",
      status: "INVALID_STATUS",
    });
    const res = await PATCH(req, TOKEN_PARAMS);
    expect(res.status).toBe(400);
  });

  it("returns 400 when applicationId is missing", async () => {
    prismaMock.guideToken.findUnique.mockResolvedValue(TOKEN_FIXTURE as never);

    const req = makeRequest(`/api/guide/${VALID_TOKEN}/payment`, "PATCH", {
      status: "PAID",
    });
    const res = await PATCH(req, TOKEN_PARAMS);
    expect(res.status).toBe(400);
  });

  it("returns 403 when application does not belong to token's group", async () => {
    prismaMock.guideToken.findUnique.mockResolvedValue(TOKEN_FIXTURE as never);
    prismaMock.application.findUnique.mockResolvedValue({
      ...APP_FIXTURE,
      groupId: "group-OTHER", // different group
    } as never);

    const req = makeRequest(`/api/guide/${VALID_TOKEN}/payment`, "PATCH", {
      applicationId: "app-1",
      status: "PAID",
    });
    const res = await PATCH(req, TOKEN_PARAMS);
    expect(res.status).toBe(403);
  });
});

// ─── Status transitions ────────────────────────────────────────────────────

describe("PATCH /api/guide/[token]/payment — PAID status", () => {
  it("sets guidePaymentStatus=PAID and paymentStatus=PAID", async () => {
    prismaMock.guideToken.findUnique.mockResolvedValue(TOKEN_FIXTURE as never);
    prismaMock.application.findUnique.mockResolvedValue(APP_FIXTURE as never);
    prismaMock.booking.update.mockResolvedValue({} as never);
    prismaMock.application.update.mockResolvedValue({} as never);

    const req = makeRequest(`/api/guide/${VALID_TOKEN}/payment`, "PATCH", {
      applicationId: "app-1",
      status: "PAID",
    });
    const res = await PATCH(req, TOKEN_PARAMS);

    expect(res.status).toBe(200);
    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ guidePaymentStatus: "PAID", paymentStatus: "PAID" }),
      })
    );
  });

  it("advances application status to ON_TOUR when PAID", async () => {
    prismaMock.guideToken.findUnique.mockResolvedValue(TOKEN_FIXTURE as never);
    prismaMock.application.findUnique.mockResolvedValue(APP_FIXTURE as never);
    prismaMock.booking.update.mockResolvedValue({} as never);
    prismaMock.application.update.mockResolvedValue({} as never);

    const req = makeRequest(`/api/guide/${VALID_TOKEN}/payment`, "PATCH", {
      applicationId: "app-1",
      status: "PAID",
    });
    await PATCH(req, TOKEN_PARAMS);

    expect(prismaMock.application.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "ON_TOUR" } })
    );
  });
});

describe("PATCH /api/guide/[token]/payment — TRANSFERRED status", () => {
  it("sets guidePaymentStatus=TRANSFERRED and paymentStatus=PAID", async () => {
    prismaMock.guideToken.findUnique.mockResolvedValue(TOKEN_FIXTURE as never);
    prismaMock.application.findUnique.mockResolvedValue(APP_FIXTURE as never);
    prismaMock.booking.update.mockResolvedValue({} as never);
    prismaMock.application.update.mockResolvedValue({} as never);

    const req = makeRequest(`/api/guide/${VALID_TOKEN}/payment`, "PATCH", {
      applicationId: "app-1",
      status: "TRANSFERRED",
    });
    await PATCH(req, TOKEN_PARAMS);

    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ guidePaymentStatus: "TRANSFERRED", paymentStatus: "PAID" }),
      })
    );
  });
});

describe("PATCH /api/guide/[token]/payment — NO_SHOW status", () => {
  it("sets application status to NO_SHOW", async () => {
    prismaMock.guideToken.findUnique.mockResolvedValue(TOKEN_FIXTURE as never);
    prismaMock.application.findUnique.mockResolvedValue(APP_FIXTURE as never);
    prismaMock.booking.update.mockResolvedValue({} as never);
    prismaMock.application.update.mockResolvedValue({} as never);

    const req = makeRequest(`/api/guide/${VALID_TOKEN}/payment`, "PATCH", {
      applicationId: "app-1",
      status: "NO_SHOW",
    });
    await PATCH(req, TOKEN_PARAMS);

    expect(prismaMock.application.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "NO_SHOW" } })
    );
  });
});

describe("PATCH /api/guide/[token]/payment — PENDING revert", () => {
  it("reverts NO_SHOW app back to IN_BUS when status set to PENDING", async () => {
    prismaMock.guideToken.findUnique.mockResolvedValue(TOKEN_FIXTURE as never);
    prismaMock.application.findUnique.mockResolvedValue({
      ...APP_FIXTURE,
      status: "NO_SHOW",
    } as never);
    prismaMock.booking.update.mockResolvedValue({} as never);
    prismaMock.application.update.mockResolvedValue({} as never);

    const req = makeRequest(`/api/guide/${VALID_TOKEN}/payment`, "PATCH", {
      applicationId: "app-1",
      status: "PENDING",
    });
    await PATCH(req, TOKEN_PARAMS);

    expect(prismaMock.application.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "IN_BUS" } })
    );
  });

  it("does NOT update application when status=PENDING and app is already IN_BUS", async () => {
    prismaMock.guideToken.findUnique.mockResolvedValue(TOKEN_FIXTURE as never);
    prismaMock.application.findUnique.mockResolvedValue({
      ...APP_FIXTURE,
      status: "IN_BUS",
    } as never);
    prismaMock.booking.update.mockResolvedValue({} as never);

    const req = makeRequest(`/api/guide/${VALID_TOKEN}/payment`, "PATCH", {
      applicationId: "app-1",
      status: "PENDING",
    });
    await PATCH(req, TOKEN_PARAMS);

    expect(prismaMock.application.update).not.toHaveBeenCalled();
  });
});
