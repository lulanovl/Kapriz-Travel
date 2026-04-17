import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/applications/[id]/companions — add companion
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

  const companion = await prisma.companion.create({
    data: {
      applicationId: params.id,
      name: name.trim(),
      whatsapp: whatsapp?.trim() || null,
    },
  });

  return NextResponse.json(companion, { status: 201 });
}
