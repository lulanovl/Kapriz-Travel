import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { personsA } = await req.json();

  const original = await prisma.application.findUnique({
    where: { id: params.id },
    include: { booking: true },
  });

  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const personsB = original.persons - personsA;

  if (personsA < 1 || personsB < 1) {
    return NextResponse.json({ error: "Каждая часть должна иметь минимум 1 человека" }, { status: 400 });
  }

  const [, newApplication] = await prisma.$transaction(async (tx) => {
    const updated = await tx.application.update({
      where: { id: params.id },
      data: { persons: personsA },
      include: {
        client: { select: { id: true, name: true, whatsapp: true, country: true } },
        booking: { select: { id: true, finalPrice: true, depositPaid: true, paymentStatus: true, currency: true, guidePaymentStatus: true } },
        manager: { select: { id: true, name: true } },
      },
    });

    if (original.booking) {
      await tx.booking.update({
        where: { id: original.booking.id },
        data: { finalPrice: original.booking.basePrice * personsA },
      });
    }

    const created = await tx.application.create({
      data: {
        clientId: original.clientId,
        tourId: original.tourId,
        departureId: original.departureId,
        managerId: original.managerId,
        status: original.status,
        persons: personsB,
        groupId: null,
      },
      include: {
        client: { select: { id: true, name: true, whatsapp: true, country: true } },
        booking: { select: { id: true, finalPrice: true, depositPaid: true, paymentStatus: true, currency: true, guidePaymentStatus: true } },
        manager: { select: { id: true, name: true } },
      },
    });

    if (original.booking) {
      await tx.booking.create({
        data: {
          applicationId: created.id,
          basePrice: original.booking.basePrice,
          finalPrice: original.booking.basePrice * personsB,
          currency: original.booking.currency,
          depositPaid: 0,
          paymentStatus: "PENDING",
        },
      });
    }

    return [updated, created];
  });

  // Re-fetch new application with its booking after transaction
  const newAppWithBooking = await prisma.application.findUnique({
    where: { id: newApplication.id },
    include: {
      client: { select: { id: true, name: true, whatsapp: true, country: true } },
      booking: { select: { id: true, finalPrice: true, depositPaid: true, paymentStatus: true, currency: true, guidePaymentStatus: true } },
      manager: { select: { id: true, name: true } },
    },
  });

  const originalWithBooking = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { id: true, name: true, whatsapp: true, country: true } },
      booking: { select: { id: true, finalPrice: true, depositPaid: true, paymentStatus: true, currency: true, guidePaymentStatus: true } },
      manager: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ original: originalWithBooking, newApplication: newAppWithBooking });
}
