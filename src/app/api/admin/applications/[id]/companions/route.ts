import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 9) return `+996${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `+996${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("996")) return `+${digits}`;
  if (digits.length > 0) return `+${digits}`;
  return raw;
}

// POST /api/admin/applications/[id]/companions — add companion
// If whatsapp is provided, also creates/finds a Client and adds tour history.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, whatsapp } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
  }

  const phone = whatsapp?.trim() ? normalizePhone(whatsapp.trim()) : null;

  const companion = await prisma.companion.create({
    data: {
      applicationId: params.id,
      name: name.trim(),
      whatsapp: phone,
    },
  });

  // If no phone — done, no client to create
  if (!phone) {
    return NextResponse.json({ ...companion, clientCreated: false }, { status: 201 });
  }

  // Fetch parent application to copy tour/departure/manager context
  const parentApp = await prisma.application.findUnique({
    where: { id: params.id },
    select: { tourId: true, departureId: true, managerId: true, status: true },
  });

  if (!parentApp) {
    return NextResponse.json({ ...companion, clientCreated: false }, { status: 201 });
  }

  // Find or create the client
  let client = await prisma.client.findUnique({ where: { whatsapp: phone } });
  let clientCreated = false;

  if (!client) {
    client = await prisma.client.create({ data: { name: name.trim(), whatsapp: phone } });
    clientCreated = true;
  }

  // Create application (tour history) only if one doesn't already exist for this departure
  const existingApp = parentApp.departureId
    ? await prisma.application.findFirst({
        where: { clientId: client.id, departureId: parentApp.departureId },
      })
    : await prisma.application.findFirst({
        where: { clientId: client.id, tourId: parentApp.tourId },
      });

  if (!existingApp) {
    await prisma.application.create({
      data: {
        clientId: client.id,
        tourId: parentApp.tourId,
        departureId: parentApp.departureId ?? undefined,
        managerId: parentApp.managerId ?? undefined,
        persons: 1,
        status: parentApp.status,
      },
    });
  }

  return NextResponse.json({ ...companion, clientCreated }, { status: 201 });
}
