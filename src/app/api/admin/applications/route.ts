import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isManager = session.user.role === "MANAGER";

  const applications = await prisma.application.findMany({
    where: isManager ? { managerId: session.user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true, whatsapp: true, country: true } },
      tour: { select: { id: true, title: true } },
      tourDate: { select: { id: true, startDate: true, endDate: true } },
      manager: { select: { id: true, name: true } },
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
    take: 500,
  });

  return NextResponse.json(applications);
}
