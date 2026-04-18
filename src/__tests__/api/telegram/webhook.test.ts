/**
 * Tests: POST /api/telegram/webhook
 * Covers: no-message body returns ok, /start welcome, /link with invalid email,
 *         /link with unknown user, /link binds chatId, unknown command reminder.
 */
import { describe, it, expect, vi } from "vitest";
import { POST } from "@/app/api/telegram/webhook/route";
import { prismaMock } from "../../helpers/prisma";
import { makeRequest } from "../../helpers/request";
import * as telegram from "@/lib/telegram";

function makeTgRequest(text: string | null, chatId = 12345) {
  const body = text
    ? { message: { chat: { id: chatId }, text } }
    : { message: {} };
  return makeRequest("/api/telegram/webhook", "POST", body);
}

const USER_FIXTURE = { id: "user-1", name: "Менеджер А", email: "manager@crm.kg" };

// ─── No message text ───────────────────────────────────────────────────────

describe("POST /api/telegram/webhook — no message", () => {
  it("returns ok when message has no text", async () => {
    const res = await POST(makeTgRequest(null));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});

// ─── /start command ────────────────────────────────────────────────────────

describe("POST /api/telegram/webhook — /start", () => {
  it("sends welcome message and returns ok", async () => {
    const sendSpy = vi.spyOn(telegram, "sendTelegramMessage");

    const res = await POST(makeTgRequest("/start"));
    expect(res.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledWith(12345, expect.stringContaining("Kapriz Travel CRM"));
  });

  it("handles /start with payload", async () => {
    const sendSpy = vi.spyOn(telegram, "sendTelegramMessage");

    const res = await POST(makeTgRequest("/start ref123"));
    expect(res.status).toBe(200);
    expect(sendSpy).toHaveBeenCalled();
  });
});

// ─── /link command ─────────────────────────────────────────────────────────

describe("POST /api/telegram/webhook — /link", () => {
  it("sends error when email is invalid (no @)", async () => {
    const sendSpy = vi.spyOn(telegram, "sendTelegramMessage");

    const res = await POST(makeTgRequest("/link notanemail"));
    expect(res.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledWith(12345, expect.stringContaining("корректный email"));
  });

  it("sends error when user not found", async () => {
    const sendSpy = vi.spyOn(telegram, "sendTelegramMessage");
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await POST(makeTgRequest("/link unknown@crm.kg"));
    expect(res.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledWith(12345, expect.stringContaining("не найден"));
  });

  it("binds chatId to user and sends success message", async () => {
    const sendSpy = vi.spyOn(telegram, "sendTelegramMessage");
    prismaMock.user.findUnique.mockResolvedValue(USER_FIXTURE as never);
    prismaMock.user.update.mockResolvedValue({ ...USER_FIXTURE, telegramChatId: "12345" } as never);

    const res = await POST(makeTgRequest("/link manager@crm.kg"));
    expect(res.status).toBe(200);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: { telegramChatId: "12345" },
      })
    );
    expect(sendSpy).toHaveBeenCalledWith(12345, expect.stringContaining("Готово"));
  });
});

// ─── Unknown command ───────────────────────────────────────────────────────

describe("POST /api/telegram/webhook — unknown command", () => {
  it("sends reminder and returns ok", async () => {
    const sendSpy = vi.spyOn(telegram, "sendTelegramMessage");

    const res = await POST(makeTgRequest("/unknown"));
    expect(res.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledWith(12345, expect.stringContaining("/link"));
  });
});

// ─── Error catch block ─────────────────────────────────────────────────────

describe("POST /api/telegram/webhook — error handling", () => {
  it("returns ok even when body is malformed JSON", async () => {
    const req = new Request("http://localhost/api/telegram/webhook", {
      method: "POST",
      body: "not-json{{{",
      headers: { "content-type": "application/json" },
    }) as unknown as Parameters<typeof POST>[0];

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
