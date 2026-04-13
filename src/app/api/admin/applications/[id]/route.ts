import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      tour: { select: { id: true, title: true, basePrice: true, slug: true } },
      departure: { select: { id: true, departureDate: true, status: true, note: true } },
      group: {
        select: {
          id: true,
          name: true,
          guide: { select: { id: true, name: true, phone: true } },
          driver: { select: { id: true, name: true, phone: true } },
        },
      },
      manager: { select: { id: true, name: true, email: true } },
      booking: {
        include: { priceHistory: { orderBy: { changedAt: "desc" } } },
      },
      reminders: {
        orderBy: { dueAt: "asc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    session.user.role === "MANAGER" &&
    application.managerId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(application);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { status, managerId, comment, persons, departureId, groupId } = body;

  const existing = await prisma.application.findUnique({
    where: { id: params.id },
    select: { managerId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    session.user.role === "MANAGER" &&
    existing.managerId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.application.update({
    where: { id: params.id },
    data: {
      ...(status !== undefined && { status }),
      ...(managerId !== undefined && { managerId }),
      ...(comment !== undefined && { comment }),
      ...(persons !== undefined && { persons }),
      ...(departureId !== undefined && { departureId: departureId || null }),
      ...(groupId !== undefined && { groupId: groupId || null }),
    },
    include: {
      client: { select: { id: true, name: true, whatsapp: true } },
      tour: { select: { id: true, title: true } },
      departure: { select: { id: true, departureDate: true } },
      group: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
