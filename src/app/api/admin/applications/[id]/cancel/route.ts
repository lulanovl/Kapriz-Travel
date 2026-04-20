import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/applications/[id]/cancel
// Cancels a booking: removes from group, archives application.
// If departure is > 24h away → deposit is refunded (depositPaid set to 0).
// If ≤ 24h away → deposit is kept by the company.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const application = await prisma.application.findUnique({
    where: { id: params.id },
    include: {
      departure: { select: { departureDate: true } },
      booking: { select: { id: true, depositPaid: true, currency: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (application.status === "ARCHIVE") {
    return NextResponse.json({ error: "Already archived" }, { status: 400 });
  }

  // 24h rule: deposit is refunded only if cancellation is more than 24h before departure
  let refundDeposit = true;
  if (application.departure) {
    const hoursUntil =
      (application.departure.departureDate.getTime() - Date.now()) / 3_600_000;
    refundDeposit = hoursUntil > 24;
  }

  const depositAmount = application.booking?.depositPaid ?? 0;

  await prisma.$transaction(async (tx) => {
    // Remove from group, archive the application
    await tx.application.update({
      where: { id: params.id },
      data: { groupId: null, status: "ARCHIVE" },
    });

    if (application.booking) {
      await tx.booking.update({
        where: { id: application.booking.id },
        data: {
          noShow: true,
          ...(refundDeposit
            ? { depositPaid: 0, paymentStatus: "PENDING", depositDate: null }
            : {}),
        },
      });
    }
  });

  return NextResponse.json({ refundDeposit, depositAmount });
}
