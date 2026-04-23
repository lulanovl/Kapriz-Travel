import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/departures/[id]/start-tour
// Moves all eligible applications for this departure to ON_TOUR status
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "SENIOR_MANAGER", "MANAGER"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await prisma.application.updateMany({
    where: {
      departureId: params.id,
      status: { in: ["NEW", "CONTACT", "PROPOSAL", "DEPOSIT", "IN_BUS"] },
    },
    data: { status: "ON_TOUR" },
  });

  return NextResponse.json({ updated: result.count });
}
