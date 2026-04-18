/**
 * Tests: POST /api/site/apply
 * Public endpoint — no auth required.
 * Covers: validation, client deduplication, application creation, UTM capture.
 */
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/site/apply/route";
import { prismaMock } from "../../helpers/prisma";
import { makeRequest } from "../../helpers/request";

const VALID_BODY = {
  name: "Иван Иванов",
  whatsapp: "+996700123456",
  country: "Кыргызстан",
  tourId: "tour-1",
};

const TOUR_FIXTURE = {
  id: "tour-1",
  title: "Иссык-Куль",
  basePrice: 5000,
  slug: "issyk-kul",
  isActive: true,
};

const CLIENT_FIXTURE = {
  id: "client-1",
  name: "Иван Иванов",
  whatsapp: "+996700123456",
  country: "Кыргызстан",
  city: null,
  tag: null,
  source: "website",
  notes: null,
  noShow: false,
  createdAt: new Date(),
};

const APP_FIXTURE = {
  id: "app-1",
  clientId: "client-1",
  tourId: "tour-1",
  departureId: null,
  persons: 1,
  status: "NEW",
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  comment: null,
  managerId: null,
  groupId: null,
  isWaitlist: false,
  createdAt: new Date(),
};

// ─── Validation ────────────────────────────────────────────────────────────

describe("POST /api/site/apply — validation", () => {
  it("returns 400 when name is missing", async () => {
    const req = makeRequest("/api/site/apply", "POST", {
      ...VALID_BODY,
      name: "",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it("returns 400 when whatsapp is missing", async () => {
    const req = makeRequest("/api/site/apply", "POST", {
      ...VALID_BODY,
      whatsapp: "",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when country is missing", async () => {
    const req = makeRequest("/api/site/apply", "POST", {
      ...VALID_BODY,
      country: "   ",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when tourId is missing", async () => {
    const req = makeRequest("/api/site/apply", "POST", {
      ...VALID_BODY,
      tourId: undefined,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when tour does not exist", async () => {
    prismaMock.tour.findUnique.mockResolvedValue(null);
    const req = makeRequest("/api/site/apply", "POST", VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});

// ─── Client deduplication ──────────────────────────────────────────────────

describe("POST /api/site/apply — client deduplication", () => {
  it("reuses existing client when same whatsapp is found", async () => {
    prismaMock.tour.findUnique.mockResolvedValue(TOUR_FIXTURE as never);
    prismaMock.client.findUnique.mockResolvedValue(CLIENT_FIXTURE as never);
    prismaMock.application.create.mockResolvedValue(APP_FIXTURE as never);
    prismaMock.user.findMany.mockResolvedValue([]);

    const req = makeRequest("/api/site/apply", "POST", VALID_BODY);
    await POST(req);

    expect(prismaMock.client.create).not.toHaveBeenCalled();
    expect(prismaMock.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientId: "client-1" }),
      })
    );
  });

  it("creates new client when whatsapp is not found", async () => {
    prismaMock.tour.findUnique.mockResolvedValue(TOUR_FIXTURE as never);
    prismaMock.client.findUnique.mockResolvedValue(null);
    prismaMock.client.create.mockResolvedValue(CLIENT_FIXTURE as never);
    prismaMock.application.create.mockResolvedValue(APP_FIXTURE as never);
    prismaMock.user.findMany.mockResolvedValue([]);

    const req = makeRequest("/api/site/apply", "POST", VALID_BODY);
    await POST(req);

    expect(prismaMock.client.create).toHaveBeenCalledOnce();
  });
});

// ─── Application creation ──────────────────────────────────────────────────

describe("POST /api/site/apply — application creation", () => {
  it("returns 200 with applicationId on success", async () => {
    prismaMock.tour.findUnique.mockResolvedValue(TOUR_FIXTURE as never);
    prismaMock.client.findUnique.mockResolvedValue(CLIENT_FIXTURE as never);
    prismaMock.application.create.mockResolvedValue(APP_FIXTURE as never);
    prismaMock.user.findMany.mockResolvedValue([]);

    const req = makeRequest("/api/site/apply", "POST", VALID_BODY);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.applicationId).toBe("app-1");
  });

  it("saves status NEW", async () => {
    prismaMock.tour.findUnique.mockResolvedValue(TOUR_FIXTURE as never);
    prismaMock.client.findUnique.mockResolvedValue(CLIENT_FIXTURE as never);
    prismaMock.application.create.mockResolvedValue(APP_FIXTURE as never);
    prismaMock.user.findMany.mockResolvedValue([]);

    const req = makeRequest("/api/site/apply", "POST", VALID_BODY);
    await POST(req);

    expect(prismaMock.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "NEW" }),
      })
    );
  });

  it("saves UTM fields when provided", async () => {
    prismaMock.tour.findUnique.mockResolvedValue(TOUR_FIXTURE as never);
    prismaMock.client.findUnique.mockResolvedValue(CLIENT_FIXTURE as never);
    prismaMock.application.create.mockResolvedValue(APP_FIXTURE as never);
    prismaMock.user.findMany.mockResolvedValue([]);

    const req = makeRequest("/api/site/apply", "POST", {
      ...VALID_BODY,
      utmSource: "instagram",
      utmMedium: "cpc",
      utmCampaign: "summer_2026",
    });
    await POST(req);

    expect(prismaMock.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          utmSource: "instagram",
          utmMedium: "cpc",
          utmCampaign: "summer_2026",
        }),
      })
    );
  });

  it("validates departure belongs to tour when departureId provided", async () => {
    prismaMock.tour.findUnique.mockResolvedValue(TOUR_FIXTURE as never);
    // Departure belongs to a different tour
    prismaMock.departure.findUnique.mockResolvedValue({
      id: "dep-1",
      tourId: "other-tour",
    } as never);

    const req = makeRequest("/api/site/apply", "POST", {
      ...VALID_BODY,
      departureId: "dep-1",
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
