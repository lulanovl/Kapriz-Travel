import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
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

// POST /api/admin/applications — create application manually from CRM
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    // client fields
    clientName,
    clientWhatsapp,
    clientCountry,
    clientCity,
    // application fields
    tourId,
    tourDateId,
    persons,
    preferredDate,
    comment,
    managerId,
    source,
  } = body;

  if (!clientName || !clientWhatsapp || !tourId || !persons) {
    return NextResponse.json(
      { error: "Обязательные поля: имя, WhatsApp, тур, кол-во человек" },
      { status: 400 }
    );
  }

  const whatsapp = String(clientWhatsapp).trim();

  // Deduplicate client by WhatsApp
  let client = await prisma.client.findUnique({ where: { whatsapp } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        name: String(clientName).trim(),
        whatsapp,
        country: clientCountry || null,
        city: clientCity || null,
      },
    });
  }

  const application = await prisma.application.create({
    data: {
      clientId: client.id,
      tourId,
      tourDateId: tourDateId || null,
      persons: Number(persons),
      preferredDate: preferredDate || null,
      comment: comment || null,
      managerId: managerId || null,
      status: "NEW",
      utmSource: source || "crm",
    },
    include: {
      client: { select: { id: true, name: true, whatsapp: true } },
      tour: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(application, { status: 201 });
}
