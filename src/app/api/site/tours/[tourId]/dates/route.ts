import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
export async function GET(
  _req: NextRequest,
  { params }: { params: { tourId: string } }
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = await prisma.tourDate.findMany({
    where: {
      tourId: params.tourId,
      startDate: { gte: today },
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      maxSeats: true,
      _count: { select: { applications: true } },
    },
    orderBy: { startDate: "asc" },
  });

  // Only return dates that still have seats
  const available = dates.filter((d) => d._count.applications < d.maxSeats);

  return NextResponse.json(available);
}
