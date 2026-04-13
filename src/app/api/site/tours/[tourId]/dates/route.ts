import { NextRequest, NextResponse } from "next/server";

// Legacy endpoint — redirected to /api/site/tours/[tourId]/departures
export async function GET(
  req: NextRequest,
  { params }: { params: { tourId: string } }
) {
  const url = new URL(req.url);
  const newUrl = url.origin + `/api/site/tours/${params.tourId}/departures`;
  return NextResponse.redirect(newUrl, 301);
}
