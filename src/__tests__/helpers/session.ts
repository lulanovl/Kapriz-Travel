import { vi } from "vitest";
import * as nextAuth from "next-auth";

type Role = "ADMIN" | "SENIOR_MANAGER" | "MANAGER" | "FINANCE";

export interface MockSession {
  user: { id: string; name: string; email: string; role: string };
  expires: string;
}

export function makeSession(role: Role, userId = `user-${role.toLowerCase()}`): MockSession {
  return {
    user: {
      id: userId,
      name: `Test ${role}`,
      email: `${role.toLowerCase()}@test.kg`,
      role,
    },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

export function mockSession(role: Role, userId?: string) {
  vi.mocked(nextAuth.getServerSession).mockResolvedValue(makeSession(role, userId) as never);
}

export function mockNoSession() {
  vi.mocked(nextAuth.getServerSession).mockResolvedValue(null);
}
