import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/tours/[id]/schedules
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schedules = await prisma.tourSchedule.findMany({
    where: { tourId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(schedules);
}

// POST /api/admin/tours/[id]/schedules — create schedule rule
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type, daysOfWeek, rangeStart, rangeEnd, note } = await req.json();

  if (!type) return NextResponse.json({ error: "type обязателен" }, { status: 400 });
  if (type === "WEEKLY" && (!daysOfWeek || daysOfWeek.length === 0)) {
    return NextResponse.json({ error: "daysOfWeek обязателен для WEEKLY" }, { status: 400 });
  }
  if (type === "DATE_RANGE" && (!rangeStart || !rangeEnd)) {
    return NextResponse.json({ error: "rangeStart и rangeEnd обязательны для DATE_RANGE" }, { status: 400 });
  }

  const schedule = await prisma.tourSchedule.create({
    data: {
      tourId: params.id,
      type,
      daysOfWeek: type === "WEEKLY" ? daysOfWeek : [],
      rangeStart: rangeStart ? new Date(rangeStart) : null,
      rangeEnd: rangeEnd ? new Date(rangeEnd) : null,
      note: note || null,
      isActive: true,
    },
  });

  return NextResponse.json(schedule, { status: 201 });
}
