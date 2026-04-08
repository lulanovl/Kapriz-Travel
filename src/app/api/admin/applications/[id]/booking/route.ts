import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/applications/[id]/booking — create or update booking
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { finalPrice, priceChangeReason, depositPaid, depositDate, currency, paymentStatus } = body;

  // Get existing booking if any
  const existing = await prisma.booking.findUnique({
    where: { applicationId: params.id },
  });

  if (existing) {
    // Track price change
    if (finalPrice !== undefined && finalPrice !== existing.finalPrice) {
      await prisma.priceHistory.create({
        data: {
          bookingId: existing.id,
          changedBy: session.user.name ?? session.user.email ?? "Unknown",
          oldPrice: existing.finalPrice,
          newPrice: finalPrice,
          reason: priceChangeReason ?? null,
        },
      });
    }

    const updated = await prisma.booking.update({
      where: { applicationId: params.id },
      data: {
        ...(finalPrice !== undefined && { finalPrice }),
        ...(priceChangeReason !== undefined && { priceChangeReason }),
        ...(depositPaid !== undefined && { depositPaid }),
        ...(depositDate !== undefined && { depositDate: new Date(depositDate) }),
        ...(currency !== undefined && { currency }),
        ...(paymentStatus !== undefined && { paymentStatus }),
      },
    });
    return NextResponse.json(updated);
  } else {
    // Create booking
    const application = await prisma.application.findUnique({
      where: { id: params.id },
      include: { tour: { select: { basePrice: true } } },
    });
    if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const booking = await prisma.booking.create({
      data: {
        applicationId: params.id,
        basePrice: application.tour.basePrice,
        finalPrice: finalPrice ?? application.tour.basePrice,
        priceChangeReason: priceChangeReason ?? null,
        depositPaid: depositPaid ?? 0,
        depositDate: depositDate ? new Date(depositDate) : null,
        currency: currency ?? "KGS",
        paymentStatus: paymentStatus ?? "PENDING",
      },
    });
    return NextResponse.json(booking);
  }
}
