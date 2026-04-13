import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/guide/[token]/payment
// Body: { applicationId: string, status: "PENDING" | "PAID" | "TRANSFERRED" | "NO_SHOW" }
// Guide marks payment status for a tourist. No CRM login required — token-based auth.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  // Validate token
  const guideToken = await prisma.guideToken.findUnique({
    where: { token: params.token },
    include: { group: { select: { id: true } } },
  });

  if (!guideToken) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  if (new Date() > guideToken.expiresAt) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  const { applicationId, status } = await req.json();
  const VALID_STATUSES = ["PENDING", "PAID", "TRANSFERRED", "NO_SHOW"];

  if (!applicationId || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Verify application belongs to this group
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, groupId: true, status: true },
  });

  if (!application || application.groupId !== guideToken.group.id) {
    return NextResponse.json({ error: "Application not in this group" }, { status: 403 });
  }

  // Update booking's guidePaymentStatus
  await prisma.booking.update({
    where: { applicationId },
    data: { guidePaymentStatus: status },
  });

  // Sync application status based on guide payment status
  if (status === "NO_SHOW") {
    // Tourist didn't show up
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: "NO_SHOW" },
    });
  } else if (status === "PAID") {
    // Tourist showed up and paid — move to ON_TOUR
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: "ON_TOUR" },
    });
  } else if (application.status === "NO_SHOW") {
    // Guide un-marked NO_SHOW (set to PENDING or TRANSFERRED) — revert to IN_BUS
    await prisma.application.update({
      where: { id: applicationId },
      data: { status: "IN_BUS" },
    });
  }

  return NextResponse.json({ ok: true, status });
}
