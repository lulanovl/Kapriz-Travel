/**
 * Tests: deprecated legacy routes — all return 410 Gone.
 *
 * Routes:
 *   PUT/DELETE /api/admin/tour-dates/[dateId]
 *   GET/POST   /api/admin/tour-dates/[dateId]/expenses
 *   POST/GET   /api/admin/tour-dates/[dateId]/guide-token
 *   GET/POST   /api/admin/tours/[id]/dates
 */
import { describe, it, expect } from "vitest";
import { PUT, DELETE } from "@/app/api/admin/tour-dates/[dateId]/route";
import { GET as GET_EXPENSES, POST as POST_EXPENSES } from "@/app/api/admin/tour-dates/[dateId]/expenses/route";
import { POST as POST_TOKEN, GET as GET_TOKEN } from "@/app/api/admin/tour-dates/[dateId]/guide-token/route";
import { GET as GET_DATES, POST as POST_DATES } from "@/app/api/admin/tours/[id]/dates/route";
import { makeRequest, makeParams } from "../../../helpers/request";

describe("Deprecated tour-dates routes — all return 410", () => {
  it("PUT /api/admin/tour-dates/[dateId] → 410", async () => {
    const res = await PUT();
    expect(res.status).toBe(410);
  });

  it("DELETE /api/admin/tour-dates/[dateId] → 410", async () => {
    const res = await DELETE();
    expect(res.status).toBe(410);
  });

  it("GET /api/admin/tour-dates/[dateId]/expenses → 410", async () => {
    const res = await GET_EXPENSES();
    expect(res.status).toBe(410);
  });

  it("POST /api/admin/tour-dates/[dateId]/expenses → 410", async () => {
    const res = await POST_EXPENSES();
    expect(res.status).toBe(410);
  });

  it("POST /api/admin/tour-dates/[dateId]/guide-token → 410", async () => {
    const res = await POST_TOKEN();
    expect(res.status).toBe(410);
  });

  it("GET /api/admin/tour-dates/[dateId]/guide-token → 410", async () => {
    const res = await GET_TOKEN();
    expect(res.status).toBe(410);
  });

  it("GET /api/admin/tours/[id]/dates → 410", async () => {
    const res = await GET_DATES();
    expect(res.status).toBe(410);
  });

  it("POST /api/admin/tours/[id]/dates → 410", async () => {
    const res = await POST_DATES();
    expect(res.status).toBe(410);
  });
});
