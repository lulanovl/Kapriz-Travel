import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: { dateId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { startDate, endDate, maxSeats, guideId, driverId } = await req.json();

  const date = await prisma.tourDate.update({
    where: { id: params.dateId },
    data: {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      maxSeats: maxSeats ? parseInt(maxSeats) : undefined,
      guideId: guideId || null,
      driverId: driverId || null,
    },
    include: {
      guide: true,
      driver: true,
      _count: { select: { applications: true } },
    },
  });

  return NextResponse.json(date);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { dateId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.tourDate.delete({ where: { id: params.dateId } });
  return NextResponse.json({ ok: true });
}
