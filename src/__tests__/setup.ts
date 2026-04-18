import { vi } from "vitest";
import { prismaMock } from "./helpers/prisma";

// Mock the prisma singleton so all API routes use the mock
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Mock next-auth — each test controls the session via mockSession() helper
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock NextAuth config (prevents DB calls inside authOptions)
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

// Mock Telegram so no real HTTP requests leave the process
vi.mock("@/lib/telegram", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
  formatApplicationNotification: vi.fn().mockReturnValue("notification text"),
}));
