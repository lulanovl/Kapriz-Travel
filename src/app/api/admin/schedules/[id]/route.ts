import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/schedules/[id] — toggle active/inactive or update
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { isActive, note, daysOfWeek, rangeStart, rangeEnd } = await req.json();

  const schedule = await prisma.tourSchedule.update({
    where: { id: params.id },
    data: {
      ...(isActive !== undefined && { isActive }),
      ...(note !== undefined && { note }),
      ...(daysOfWeek !== undefined && { daysOfWeek }),
      ...(rangeStart !== undefined && { rangeStart: rangeStart ? new Date(rangeStart) : null }),
      ...(rangeEnd !== undefined && { rangeEnd: rangeEnd ? new Date(rangeEnd) : null }),
    },
  });

  return NextResponse.json(schedule);
}

// DELETE /api/admin/schedules/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.tourSchedule.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
