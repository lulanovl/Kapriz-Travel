import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dates = await prisma.tourDate.findMany({
    where: { tourId: params.id },
    include: {
      guide: true,
      driver: true,
      _count: { select: { applications: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(dates);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { startDate, endDate, maxSeats, guideId, driverId } = await req.json();

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "startDate и endDate обязательны" }, { status: 400 });
  }

  const date = await prisma.tourDate.create({
    data: {
      tourId: params.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      maxSeats: maxSeats ? parseInt(maxSeats) : 10,
      guideId: guideId || null,
      driverId: driverId || null,
    },
    include: {
      guide: true,
      driver: true,
      _count: { select: { applications: true } },
    },
  });

  return NextResponse.json(date, { status: 201 });
}
