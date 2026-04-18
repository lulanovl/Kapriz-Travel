import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/tours/[id]/departures — list all departures for a tour
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departures = await prisma.departure.findMany({
    where: { tourId: params.id },
    include: {
      groups: {
        include: {
          guide: { select: { id: true, name: true, phone: true } },
          driver: { select: { id: true, name: true, phone: true } },
          applications: { select: { persons: true } },
        },
      },
      _count: { select: { applications: true } },
    },
    orderBy: { departureDate: "asc" },
  });

  return NextResponse.json(departures);
}

// POST /api/admin/tours/[id]/departures — create a new departure date
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { departureDate, note } = await req.json();

  if (!departureDate) {
    return NextResponse.json({ error: "departureDate обязателен" }, { status: 400 });
  }

  const departure = await prisma.departure.create({
    data: {
      tourId: params.id,
      departureDate: new Date(departureDate),
      status: "OPEN",
      note: note || null,
    },
    include: {
      groups: true,
      _count: { select: { applications: true } },
    },
  });

  return NextResponse.json(departure, { status: 201 });
}
