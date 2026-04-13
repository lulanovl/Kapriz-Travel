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

  // Auto-generate departures (all CLOSED — managers activate individually)
  const departureDates: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (type === "WEEKLY") {
    const end = new Date(today);
    end.setDate(end.getDate() + 60);
    const cur = new Date(today);
    while (cur <= end) {
      if ((daysOfWeek as number[]).includes(cur.getDay())) {
        departureDates.push(new Date(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }
  } else if (type === "DATE_RANGE" && rangeStart && rangeEnd) {
    const start = new Date(rangeStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(rangeEnd);
    end.setHours(0, 0, 0, 0);
    const cur = new Date(start);
    while (cur <= end) {
      departureDates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }

  if (departureDates.length > 0) {
    await prisma.departure.createMany({
      data: departureDates.map((d) => ({
        tourId: params.id,
        departureDate: d,
        status: "CLOSED",
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json(schedule, { status: 201 });
}
