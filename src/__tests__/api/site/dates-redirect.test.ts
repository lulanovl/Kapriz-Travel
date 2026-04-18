/**
 * Tests: GET /api/site/tours/[tourId]/dates
 * Covers: legacy redirect returns 301 to /departures endpoint.
 */
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/site/tours/[tourId]/dates/route";
import { makeRequest, makeParams } from "../../helpers/request";

describe("GET /api/site/tours/[tourId]/dates — redirect", () => {
  it("redirects to /departures with 301", async () => {
    const res = await GET(
      makeRequest("http://localhost/api/site/tours/tour-1/dates"),
      makeParams({ tourId: "tour-1" })
    );
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toContain("/departures");
  });
});
