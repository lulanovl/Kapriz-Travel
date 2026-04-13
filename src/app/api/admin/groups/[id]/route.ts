import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/groups/[id] — update group (name, guide, driver, maxSeats, notes)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, guideId, driverId, maxSeats, notes } = await req.json();

  const group = await prisma.group.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(guideId !== undefined && { guideId: guideId || null }),
      ...(driverId !== undefined && { driverId: driverId || null }),
      ...(maxSeats !== undefined && { maxSeats: parseInt(maxSeats) }),
      ...(notes !== undefined && { notes }),
    },
    include: {
      guide: { select: { id: true, name: true, phone: true } },
      driver: { select: { id: true, name: true, phone: true } },
      _count: { select: { applications: true } },
    },
  });

  return NextResponse.json(group);
}

// DELETE /api/admin/groups/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Unassign all applications from this group before deleting
  await prisma.application.updateMany({
    where: { groupId: params.id },
    data: { groupId: null },
  });

  await prisma.group.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
