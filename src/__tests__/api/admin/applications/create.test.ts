/**
 * Tests: POST /api/admin/applications (manual creation from CRM)
 * Covers: auth, validation, client dedup, source default.
 */
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/admin/applications/route";
import { prismaMock } from "../../../helpers/prisma";
import { mockSession, mockNoSession } from "../../../helpers/session";
import { makeRequest } from "../../../helpers/request";

const VALID_BODY = {
  clientName: "Алибек Джумабеков",
  clientWhatsapp: "+996555777888",
  clientCountry: "Кыргызстан",
  tourId: "tour-1",
  persons: 2,
};

const CLIENT_FIXTURE = {
  id: "c-1",
  name: "Алибек Джумабеков",
  whatsapp: "+996555777888",
  country: "Кыргызстан",
  city: null,
  tag: null,
  source: null,
  notes: null,
  noShow: false,
  createdAt: new Date(),
};

const APP_FIXTURE = {
  id: "app-new",
  clientId: "c-1",
  tourId: "tour-1",
  status: "NEW",
  utmSource: "crm",
  persons: 2,
  client: { id: "c-1", name: "Алибек", whatsapp: "+996555777888" },
  tour: { id: "tour-1", title: "Сон-Куль" },
  departure: null,
  createdAt: new Date(),
};

// ─── Auth guard ────────────────────────────────────────────────────────────

describe("POST /api/admin/applications — auth", () => {
  it("returns 401 when not authenticated", async () => {
    mockNoSession();
    const req = makeRequest("/api/admin/applications", "POST", VALID_BODY);
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

// ─── Validation ────────────────────────────────────────────────────────────

describe("POST /api/admin/applications — validation", () => {
  it("returns 400 when clientName is missing", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/applications", "POST", {
      ...VALID_BODY,
      clientName: undefined,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when clientWhatsapp is missing", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/applications", "POST", {
      ...VALID_BODY,
      clientWhatsapp: undefined,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when tourId is missing", async () => {
    mockSession("MANAGER");
    const req = makeRequest("/api/admin/applications", "POST", {
      ...VALID_BODY,
      tourId: undefined,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ─── Creation logic ────────────────────────────────────────────────────────

describe("POST /api/admin/applications — creation", () => {
  it("returns 201 with application on success", async () => {
    mockSession("MANAGER");
    prismaMock.client.findUnique.mockResolvedValue(CLIENT_FIXTURE as never);
    prismaMock.application.create.mockResolvedValue(APP_FIXTURE as never);

    const req = makeRequest("/api/admin/applications", "POST", VALID_BODY);
    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBe("app-new");
  });

  it("sets utmSource to 'crm' by default", async () => {
    mockSession("MANAGER");
    prismaMock.client.findUnique.mockResolvedValue(CLIENT_FIXTURE as never);
    prismaMock.application.create.mockResolvedValue(APP_FIXTURE as never);

    const req = makeRequest("/api/admin/applications", "POST", VALID_BODY);
    await POST(req);

    expect(prismaMock.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ utmSource: "crm" }),
      })
    );
  });

  it("deduplicates client — reuses existing by whatsapp", async () => {
    mockSession("ADMIN");
    prismaMock.client.findUnique.mockResolvedValue(CLIENT_FIXTURE as never);
    prismaMock.application.create.mockResolvedValue(APP_FIXTURE as never);

    const req = makeRequest("/api/admin/applications", "POST", VALID_BODY);
    await POST(req);

    expect(prismaMock.client.create).not.toHaveBeenCalled();
    expect(prismaMock.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ clientId: "c-1" }),
      })
    );
  });

  it("creates new client when not found by whatsapp", async () => {
    mockSession("MANAGER");
    prismaMock.client.findUnique.mockResolvedValue(null);
    prismaMock.client.create.mockResolvedValue(CLIENT_FIXTURE as never);
    prismaMock.application.create.mockResolvedValue(APP_FIXTURE as never);

    const req = makeRequest("/api/admin/applications", "POST", VALID_BODY);
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(prismaMock.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Алибек Джумабеков", whatsapp: "+996555777888" }),
      })
    );
  });
});
