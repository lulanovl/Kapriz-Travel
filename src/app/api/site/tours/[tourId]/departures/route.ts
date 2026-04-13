import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required
// Returns open departures for a tour with seat availability info
export async function GET(
  _req: NextRequest,
  { params }: { params: { tourId: string } }
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const departures = await prisma.departure.findMany({
    where: {
      tourId: params.tourId,
      status: "OPEN",
      departureDate: { gte: today },
    },
    include: {
      _count: { select: { applications: true } },
      groups: {
        select: { maxSeats: true, _count: { select: { applications: true } } },
      },
    },
    orderBy: { departureDate: "asc" },
  });

  // Calculate total max seats across all groups (if groups exist)
  // If no groups yet, we don't restrict capacity at departure level
  const result = departures.map((d) => {
    const totalGroupSeats = d.groups.reduce((sum, g) => sum + g.maxSeats, 0);
    const groupApplications = d.groups.reduce((sum, g) => sum + g._count.applications, 0);
    const totalApplications = d._count.applications;

    return {
      id: d.id,
      departureDate: d.departureDate,
      status: d.status,
      note: d.note,
      applicationCount: totalApplications,
      // If groups are configured, show seats from groups; otherwise show raw count
      maxSeats: totalGroupSeats > 0 ? totalGroupSeats : null,
      groupApplications: groupApplications,
    };
  });

  return NextResponse.json(result);
}
