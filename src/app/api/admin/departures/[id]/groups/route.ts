import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/departures/[id]/groups
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groups = await prisma.group.findMany({
    where: { departureId: params.id },
    include: {
      guide: { select: { id: true, name: true, phone: true } },
      driver: { select: { id: true, name: true, phone: true } },
      applications: {
        include: {
          client: { select: { id: true, name: true, whatsapp: true, country: true } },
          booking: {
            select: { finalPrice: true, depositPaid: true, paymentStatus: true, currency: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      expenses: { orderBy: { createdAt: "asc" } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(groups);
}

// POST /api/admin/departures/[id]/groups — create a new bus group
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, guideId, driverId, maxSeats, notes } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "name обязателен" }, { status: 400 });
  }

  const group = await prisma.group.create({
    data: {
      departureId: params.id,
      name,
      guideId: guideId || null,
      driverId: driverId || null,
      maxSeats: maxSeats ? parseInt(maxSeats) : 15,
      notes: notes || null,
    },
    include: {
      guide: { select: { id: true, name: true, phone: true } },
      driver: { select: { id: true, name: true, phone: true } },
      _count: { select: { applications: true } },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
