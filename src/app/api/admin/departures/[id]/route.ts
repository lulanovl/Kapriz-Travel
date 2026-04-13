import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/departures/[id] — departure detail with all groups and applications
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const departure = await prisma.departure.findUnique({
    where: { id: params.id },
    include: {
      tour: { select: { id: true, title: true, slug: true, basePrice: true, duration: true } },
      groups: {
        include: {
          guide: { select: { id: true, name: true, phone: true } },
          driver: { select: { id: true, name: true, phone: true } },
          applications: {
            include: {
              client: { select: { id: true, name: true, whatsapp: true, country: true } },
              booking: {
                select: {
                  id: true,
                  finalPrice: true,
                  depositPaid: true,
                  paymentStatus: true,
                  currency: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          expenses: { orderBy: { createdAt: "asc" } },
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      // Unassigned applications (groupId = null)
      applications: {
        where: { groupId: null },
        include: {
          client: { select: { id: true, name: true, whatsapp: true, country: true } },
          booking: {
            select: {
              id: true,
              finalPrice: true,
              depositPaid: true,
              paymentStatus: true,
              currency: true,
            },
          },
          manager: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!departure) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(departure);
}

// PATCH /api/admin/departures/[id] — update departure status/note
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status, note, departureDate } = await req.json();

  const departure = await prisma.departure.update({
    where: { id: params.id },
    data: {
      ...(status !== undefined && { status }),
      ...(note !== undefined && { note }),
      ...(departureDate !== undefined && { departureDate: new Date(departureDate) }),
    },
  });

  return NextResponse.json(departure);
}

// DELETE /api/admin/departures/[id] — delete departure (only if no applications)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const count = await prisma.application.count({ where: { departureId: params.id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Нельзя удалить выезд: есть ${count} заявок` },
      { status: 400 }
    );
  }

  await prisma.departure.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
